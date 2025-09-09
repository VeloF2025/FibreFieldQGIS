/**
 * Assignment Accept API - Accept a specific assignment
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
    const assignmentId = params.id;
    
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, estimatedStartTime, notes } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get assignment document
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignmentData = assignmentDoc.data();

    // Check if assignment is already accepted or completed
    if (assignmentData.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Assignment already accepted' },
        { status: 409 }
      );
    }

    if (assignmentData.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Assignment already completed' },
        { status: 409 }
      );
    }

    // Check if user is assigned to this task
    if (assignmentData.assignedTo !== userId) {
      return NextResponse.json(
        { success: false, error: 'Assignment not assigned to this user' },
        { status: 403 }
      );
    }

    // Update assignment status
    const updateData: any = {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      acceptedBy: userId
    };

    if (estimatedStartTime) {
      updateData.estimatedStartTime = Timestamp.fromDate(new Date(estimatedStartTime));
    }

    if (notes) {
      updateData.acceptanceNotes = notes;
    }

    await updateDoc(assignmentRef, updateData);

    // Create activity log entry
    await addDoc(collection(db, 'assignment_activity_log'), {
      assignmentId,
      action: 'accepted',
      userId,
      timestamp: Timestamp.now(),
      details: {
        estimatedStartTime,
        notes
      }
    });

    // Create notification for assignment creator/admin
    await addDoc(collection(db, 'notifications'), {
      userId: assignmentData.createdBy || 'admin',
      type: 'assignment_accepted',
      title: 'Assignment Accepted',
      message: `Assignment for ${assignmentData.serviceArea} has been accepted`,
      data: {
        assignmentId,
        acceptedBy: userId,
        serviceArea: assignmentData.serviceArea
      },
      read: false,
      createdAt: Timestamp.now()
    });

    // Get updated assignment data
    const updatedDoc = await getDoc(assignmentRef);
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        id: assignmentId,
        ...updatedData,
        createdAt: updatedData?.createdAt?.toDate?.()?.toISOString(),
        dueDate: updatedData?.dueDate?.toDate?.()?.toISOString(),
        acceptedAt: updatedData?.acceptedAt?.toDate?.()?.toISOString(),
        estimatedStartTime: updatedData?.estimatedStartTime?.toDate?.()?.toISOString()
      },
      message: 'Assignment accepted successfully'
    });

  } catch (error: unknown) {
    console.error('Assignment accept error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to accept assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}