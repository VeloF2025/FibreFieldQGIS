/**
 * Assignments API - Manage home drop assignments
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const assignedTo = searchParams.get('assignedTo');
    const projectId = searchParams.get('project');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limitCount = parseInt(searchParams.get('limit') || '50');

    // Build base query
    let assignmentsQuery = query(
      collection(db, 'assignments'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    // Apply filters
    if (assignedTo) {
      assignmentsQuery = query(
        collection(db, 'assignments'),
        where('assignedTo', '==', assignedTo),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    if (projectId) {
      assignmentsQuery = query(
        collection(db, 'assignments'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    if (status && assignedTo) {
      assignmentsQuery = query(
        collection(db, 'assignments'),
        where('assignedTo', '==', assignedTo),
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    if (priority && assignedTo) {
      assignmentsQuery = query(
        collection(db, 'assignments'),
        where('assignedTo', '==', assignedTo),
        where('priority', '==', priority),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(assignmentsQuery);
    const assignments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      dueDate: doc.data().dueDate?.toDate?.()?.toISOString(),
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString(),
      acceptedAt: doc.data().acceptedAt?.toDate?.()?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length
    });

  } catch (error: unknown) {
    console.error('Assignments GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch assignments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['projectId', 'assignedTo', 'serviceArea', 'priority'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // Set default due date if not provided (7 days from now)
    let dueDate = body.dueDate;
    if (!dueDate) {
      const defaultDue = new Date();
      defaultDue.setDate(defaultDue.getDate() + 7);
      dueDate = defaultDue.toISOString();
    }

    // Create assignment document
    const assignmentData = {
      ...body,
      status: body.status || 'assigned',
      dueDate: Timestamp.fromDate(new Date(dueDate)),
      createdAt: Timestamp.now(),
      estimatedDuration: body.estimatedDuration || '2-3 hours',
      requirements: body.requirements || [
        'GPS location validation',
        '4 required photos (Power Meter, Fibertime Setup, Device Actions, Router Lights)',
        'Customer information collection',
        'Quality validation'
      ]
    };

    const docRef = await addDoc(collection(db, 'assignments'), assignmentData);

    // Create notification for assigned technician
    await addDoc(collection(db, 'notifications'), {
      userId: body.assignedTo,
      type: 'assignment_created',
      title: 'New Assignment',
      message: `You have been assigned to service area: ${body.serviceArea}`,
      data: {
        assignmentId: docRef.id,
        serviceArea: body.serviceArea,
        priority: body.priority
      },
      read: false,
      createdAt: Timestamp.now()
    });

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...assignmentData,
        createdAt: assignmentData.createdAt.toDate().toISOString(),
        dueDate: assignmentData.dueDate.toDate().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('Assignments POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}