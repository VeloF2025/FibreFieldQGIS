/**
 * Admin Reject API - Reject a specific capture with feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const captureId = params.id;
    
    if (!captureId) {
      return NextResponse.json(
        { success: false, error: 'Capture ID is required' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { 
      adminUserId, 
      rejectionReason,
      rejectionNotes, 
      issuesFound = [],
      requiresRecapture = true,
      allowRevision = true 
    } = body;

    if (!adminUserId || !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'Admin user ID and rejection reason are required' },
        { status: 400 }
      );
    }

    // Try to find the capture in home_drop_captures first
    let captureRef = doc(db, 'home_drop_captures', captureId);
    let captureDoc = await getDoc(captureRef);
    let captureType = 'home_drop';

    // If not found, try pole_captures
    if (!captureDoc.exists()) {
      captureRef = doc(db, 'pole_captures', captureId);
      captureDoc = await getDoc(captureRef);
      captureType = 'pole';
    }

    if (!captureDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Capture not found' },
        { status: 404 }
      );
    }

    const captureData = captureDoc.data();

    // Check if already processed
    if (captureData.approvalStatus === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Capture already approved' },
        { status: 409 }
      );
    }

    if (captureData.approvalStatus === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Capture already rejected' },
        { status: 409 }
      );
    }

    // Determine new status based on rejection type
    const newStatus = requiresRecapture ? 'requires_recapture' : (allowRevision ? 'revision_requested' : 'rejected');

    // Update rejection status
    const rejectionData = {
      approvalStatus: 'rejected',
      status: newStatus,
      rejectedAt: Timestamp.now(),
      rejectedBy: adminUserId,
      rejection: {
        reason: rejectionReason,
        notes: rejectionNotes || '',
        issues: issuesFound,
        requiresRecapture,
        allowRevision,
        adminFeedback: generateAdminFeedback(rejectionReason, issuesFound)
      },
      revisionCount: (captureData.revisionCount || 0) + 1
    };

    await updateDoc(captureRef, rejectionData);

    // Create rejection audit log
    await addDoc(collection(db, `${captureType}_approval_log`), {
      captureId,
      action: 'rejected',
      adminUserId,
      timestamp: Timestamp.now(),
      details: {
        rejectionReason,
        rejectionNotes,
        issuesFound,
        requiresRecapture,
        allowRevision,
        serviceAddress: captureData.serviceAddress,
        contractorId: captureData.contractorId,
        revisionCount: rejectionData.revisionCount
      }
    });

    // Create detailed notification for the technician
    if (captureData.contractorId) {
      const notificationMessage = generateRejectionNotification(
        captureType, 
        rejectionReason, 
        requiresRecapture, 
        allowRevision
      );

      await addDoc(collection(db, 'notifications'), {
        userId: captureData.contractorId,
        type: 'capture_rejected',
        title: 'Capture Requires Attention',
        message: notificationMessage,
        data: {
          captureId,
          captureType,
          serviceAddress: captureData.serviceAddress,
          rejectionReason,
          issuesFound,
          requiresRecapture,
          allowRevision,
          rejectedBy: adminUserId,
          actionRequired: requiresRecapture ? 'recapture' : (allowRevision ? 'revision' : 'contact_admin')
        },
        priority: 'high',
        read: false,
        createdAt: Timestamp.now()
      });
    }

    // If requires recapture, create a new assignment
    if (requiresRecapture && captureData.assignmentId) {
      await addDoc(collection(db, 'assignments'), {
        projectId: captureData.projectId,
        assignedTo: captureData.contractorId,
        serviceArea: captureData.serviceAddress,
        status: 'assigned',
        priority: 'high', // High priority for recaptures
        type: 'recapture',
        originalCaptureId: captureId,
        reason: `Recapture required: ${rejectionReason}`,
        requirements: [
          'Address previous rejection issues',
          'Ensure photo quality meets standards',
          'Validate GPS accuracy',
          'Complete all required documentation'
        ],
        createdAt: Timestamp.now(),
        dueDate: Timestamp.fromDate(
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days to recapture
        ),
        createdBy: adminUserId,
        notes: rejectionNotes
      });
    }

    // Get updated capture data
    const updatedDoc = await getDoc(captureRef);
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        id: captureId,
        type: captureType,
        ...updatedData,
        capturedAt: updatedData?.capturedAt?.toDate?.()?.toISOString(),
        rejectedAt: updatedData?.rejectedAt?.toDate?.()?.toISOString()
      },
      message: 'Capture rejection processed successfully'
    });

  } catch (error: unknown) {
    console.error('Reject capture error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to generate admin feedback
function generateAdminFeedback(reason: string, issues: string[]): string {
  let feedback = `Rejection Reason: ${reason}\n\n`;
  
  if (issues.length > 0) {
    feedback += 'Issues Found:\n';
    issues.forEach((issue, index) => {
      feedback += `${index + 1}. ${issue}\n`;
    });
    feedback += '\n';
  }

  feedback += 'Recommendations:\n';
  
  // Generate specific recommendations based on rejection reason
  switch (reason.toLowerCase()) {
    case 'poor photo quality':
      feedback += '• Ensure adequate lighting conditions\n';
      feedback += '• Hold device steady to avoid blur\n';
      feedback += '• Capture images at recommended distances\n';
      feedback += '• Clean camera lens before taking photos\n';
      break;
      
    case 'incomplete information':
      feedback += '• Complete all required fields\n';
      feedback += '• Verify customer information accuracy\n';
      feedback += '• Add detailed notes where applicable\n';
      break;
      
    case 'gps accuracy':
      feedback += '• Move to an open area with clear sky view\n';
      feedback += '• Wait for GPS accuracy under 10 meters\n';
      feedback += '• Retry GPS capture if accuracy is poor\n';
      break;
      
    case 'missing required photos':
      feedback += '• Capture all 4 required photo types\n';
      feedback += '• Ensure each photo clearly shows the required subject\n';
      feedback += '• Follow photo capture guidelines\n';
      break;
      
    default:
      feedback += '• Review capture requirements\n';
      feedback += '• Contact support if you need assistance\n';
      break;
  }

  return feedback;
}

// Helper function to generate rejection notification message
function generateRejectionNotification(
  captureType: string, 
  reason: string, 
  requiresRecapture: boolean, 
  allowRevision: boolean
): string {
  const typeLabel = captureType === 'home_drop' ? 'home drop' : 'pole';
  
  let message = `Your ${typeLabel} capture was rejected due to: ${reason}. `;
  
  if (requiresRecapture) {
    message += 'A new capture is required. Please visit the location again and submit a new capture.';
  } else if (allowRevision) {
    message += 'You can revise and resubmit this capture with corrections.';
  } else {
    message += 'Please contact your supervisor for further instructions.';
  }
  
  return message;
}