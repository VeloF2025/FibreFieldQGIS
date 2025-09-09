/**
 * Contractors API - Get contractor information
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active') !== 'false';

    // Build Firestore query
    let contractorsQuery = query(
      collection(db, 'contractors'),
      orderBy('name')
    );

    if (active) {
      contractorsQuery = query(
        collection(db, 'contractors'),
        where('active', '==', true),
        orderBy('name')
      );
    }

    const querySnapshot = await getDocs(contractorsQuery);
    const contractors = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: contractors,
      count: contractors.length
    });

  } catch (error: unknown) {
    console.error('Contractors API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch contractors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}