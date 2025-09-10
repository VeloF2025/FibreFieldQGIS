/**
 * Admin Approve API - Approve a specific capture
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const captureId = resolvedParams.id;
    
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
      approvalNotes, 
      qualityScore,
      scheduleClientDelivery = true,
      deliveryNotes 
    } = body;

    if (!adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Admin user ID is required' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
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

    // Check if already approved
    if (captureData.approvalStatus === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Capture already approved' },
        { status: 409 }
      );
    }

    // Update approval status
    const approvalData: any = {
      approvalStatus: 'approved',
      approvedAt: Timestamp.now(),
      approvedBy: adminUserId,
      approvalNotes: approvalNotes || '',
      finalQualityScore: qualityScore || captureData.qualityScore || 85
    };

    // Add client delivery scheduling if requested
    if (scheduleClientDelivery && captureType === 'home_drop') {
      approvalData.clientDelivery = {
        status: 'scheduled',
        scheduledAt: Timestamp.now(),
        notes: deliveryNotes || 'Approved for client delivery'
      };
    }

    await updateDoc(captureRef, approvalData);

    // Create approval audit log
    await addDoc(collection(db, `${captureType}_approval_log`), {
      captureId,
      action: 'approved',
      adminUserId,
      timestamp: Timestamp.now(),
      details: {
        approvalNotes,
        qualityScore,
        scheduleClientDelivery,
        deliveryNotes,
        serviceAddress: captureData.serviceAddress,
        contractorId: captureData.contractorId
      }
    });

    // Create notification for the technician who submitted
    if (captureData.contractorId) {
      await addDoc(collection(db, 'notifications'), {
        userId: captureData.contractorId,
        type: 'capture_approved',
        title: 'Capture Approved',
        message: `Your ${captureType === 'home_drop' ? 'home drop' : 'pole'} capture has been approved`,
        data: {
          captureId,
          captureType,
          serviceAddress: captureData.serviceAddress,
          approvedBy: adminUserId,
          qualityScore: approvalData.finalQualityScore
        },
        read: false,
        createdAt: Timestamp.now()
      });
    }

    // Schedule client delivery if applicable
    if (scheduleClientDelivery && captureType === 'home_drop') {
      await addDoc(collection(db, 'client_delivery_queue'), {
        captureId,
        captureType,
        status: 'queued',
        priority: captureData.assignment?.priority || 'medium',
        customerInfo: captureData.customerInfo,
        serviceAddress: captureData.serviceAddress,
        photos: captureData.photos ? Object.keys(captureData.photos) : [],
        queuedAt: Timestamp.now(),
        scheduledDeliveryDate: Timestamp.fromDate(
          new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
        ),
        notes: deliveryNotes
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
        approvedAt: updatedData?.approvedAt?.toDate?.()?.toISOString()
      },
      message: 'Capture approved successfully'
    });

  } catch (error: unknown) {
    log.error('Approve capture error:', {}, "Route", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}