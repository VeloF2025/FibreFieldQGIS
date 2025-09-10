/**
 * Admin Pending Approvals API - Get items awaiting approval
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
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
    const type = searchParams.get('type') || 'all'; // 'home-drops', 'poles', 'all'
    const projectId = searchParams.get('project');
    const priority = searchParams.get('priority');
    const limitCount = parseInt(searchParams.get('limit') || '50');

    const pendingItems: any[] = [];

    // Fetch pending home drop approvals
    if (type === 'home-drops' || type === 'all') {
      let homeDropQuery = query(
        collection(db, 'home_drop_captures'),
        where('approvalStatus', '==', 'pending'),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );

      if (projectId) {
        homeDropQuery = query(
          collection(db, 'home_drop_captures'),
          where('approvalStatus', '==', 'pending'),
          where('projectId', '==', projectId),
          orderBy('capturedAt', 'desc'),
          limit(limitCount)
        );
      }

      const homeDropSnapshot = await getDocs(homeDropQuery);
      const homeDrops = homeDropSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'home_drop',
        ...doc.data(),
        capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
        submittedAt: doc.data().capturedAt?.toDate?.()?.toISOString()
      }));

      pendingItems.push(...homeDrops);
    }

    // Fetch pending pole approvals (if they require approval)
    if (type === 'poles' || type === 'all') {
      let poleQuery = query(
        collection(db, 'pole_captures'),
        where('status', '==', 'pending_approval'),
        orderBy('capturedAt', 'desc'),
        limit(limitCount)
      );

      if (projectId) {
        poleQuery = query(
          collection(db, 'pole_captures'),
          where('status', '==', 'pending_approval'),
          where('projectId', '==', projectId),
          orderBy('capturedAt', 'desc'),
          limit(limitCount)
        );
      }

      const poleSnapshot = await getDocs(poleQuery);
      const poles = poleSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'pole',
        approvalStatus: 'pending',
        ...doc.data(),
        capturedAt: doc.data().capturedAt?.toDate?.()?.toISOString(),
        submittedAt: doc.data().capturedAt?.toDate?.()?.toISOString()
      }));

      pendingItems.push(...poles);
    }

    // Sort all items by submission date (most recent first)
    pendingItems.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    // Apply priority filter if specified
    let filteredItems = pendingItems;
    if (priority) {
      filteredItems = pendingItems.filter(item => {
        // Calculate priority based on various factors
        const itemPriority = calculatePriority(item);
        return itemPriority === priority;
      });
    }

    // Limit results
    const results = filteredItems.slice(0, limitCount);

    // Calculate summary statistics
    const summary = {
      total: results.length,
      homeDrops: results.filter(item => item.type === 'home_drop').length,
      poles: results.filter(item => item.type === 'pole').length,
      highPriority: results.filter(item => calculatePriority(item) === 'high').length,
      oldestDays: results.length > 0 ? Math.floor(
        (Date.now() - new Date(results[results.length - 1].submittedAt).getTime()) / (1000 * 60 * 60 * 24)
      ) : 0
    };

    return NextResponse.json({
      success: true,
      data: results,
      summary,
      filters: {
        type,
        projectId,
        priority,
        limit: limitCount
      }
    });

  } catch (error: unknown) {
    log.error('Pending approvals API error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending approvals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate item priority
function calculatePriority(item: any): 'high' | 'medium' | 'low' {
  const now = Date.now();
  const submittedAt = new Date(item.submittedAt).getTime();
  const daysSinceSubmission = (now - submittedAt) / (1000 * 60 * 60 * 24);

  // High priority criteria
  if (daysSinceSubmission >= 3) return 'high'; // Older than 3 days
  if (item.assignment && item.assignment.priority === 'high') return 'high'; // High priority assignment
  if (item.customerInfo && item.customerInfo.vip) return 'high'; // VIP customer
  if (item.qualityScore && item.qualityScore < 70) return 'high'; // Low quality score needs review

  // Medium priority criteria  
  if (daysSinceSubmission >= 1) return 'medium'; // Older than 1 day
  if (item.photos && Object.keys(item.photos).length < 4) return 'medium'; // Incomplete photos

  return 'low';
}