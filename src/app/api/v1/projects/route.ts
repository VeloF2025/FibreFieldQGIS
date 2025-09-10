/**
 * Projects API - Get available projects for field data collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractor');
    const status = searchParams.get('status') || 'active';

    // Build Firestore query
    let projectsQuery = query(
      collection(db, 'projects'),
      where('status', '==', status),
      orderBy('name')
    );

    // Filter by contractor if provided
    if (contractorId) {
      projectsQuery = query(
        collection(db, 'projects'),
        where('status', '==', status),
        where('contractors', 'array-contains', contractorId),
        orderBy('name')
      );
    }

    const querySnapshot = await getDocs(projectsQuery);
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length
    });

  } catch (error: unknown) {
    log.error('Projects API error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Implement project creation
    // This would typically require admin permissions
    
    return NextResponse.json({
      success: false,
      error: 'Project creation not implemented'
    }, { status: 501 });

  } catch (error: unknown) {
    log.error('Projects POST error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}