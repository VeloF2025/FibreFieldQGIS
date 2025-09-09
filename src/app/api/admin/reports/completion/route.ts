/**
 * Admin Completion Reports API - Generate completion and performance reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');
    const contractorId = searchParams.get('contractor');
    const days = parseInt(searchParams.get('days') || '30');
    const type = searchParams.get('type') || 'all'; // 'summary', 'detailed', 'performance', 'all'

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = Timestamp.fromDate(startDate);

    // Initialize report data
    const reportData: any = {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      filters: {
        projectId,
        contractorId
      }
    };

    // Fetch home drop captures
    let homeDropQuery = query(
      collection(db, 'home_drop_captures'),
      where('capturedAt', '>=', startTimestamp),
      orderBy('capturedAt', 'desc')
    );

    if (projectId) {
      homeDropQuery = query(
        collection(db, 'home_drop_captures'),
        where('projectId', '==', projectId),
        where('capturedAt', '>=', startTimestamp),
        orderBy('capturedAt', 'desc')
      );
    }

    if (contractorId && projectId) {
      homeDropQuery = query(
        collection(db, 'home_drop_captures'),
        where('projectId', '==', projectId),
        where('contractorId', '==', contractorId),
        where('capturedAt', '>=', startTimestamp),
        orderBy('capturedAt', 'desc')
      );
    }

    // Fetch pole captures
    let poleQuery = query(
      collection(db, 'pole_captures'),
      where('capturedAt', '>=', startTimestamp),
      orderBy('capturedAt', 'desc')
    );

    if (projectId) {
      poleQuery = query(
        collection(db, 'pole_captures'),
        where('projectId', '==', projectId),
        where('capturedAt', '>=', startTimestamp),
        orderBy('capturedAt', 'desc')
      );
    }

    // Execute queries
    const [homeDropSnapshot, poleSnapshot] = await Promise.all([
      getDocs(homeDropQuery),
      getDocs(poleQuery)
    ]);

    const homeDrops = homeDropSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'home_drop',
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate(),
      approvedAt: doc.data().approvedAt?.toDate()
    }));

    const poles = poleSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'pole',
      ...doc.data(),
      capturedAt: doc.data().capturedAt?.toDate(),
      approvedAt: doc.data().approvedAt?.toDate()
    }));

    const allCaptures = [...homeDrops, ...poles];

    // Generate Summary Report
    if (type === 'summary' || type === 'all') {
      reportData.summary = {
        totals: {
          homeDrops: homeDrops.length,
          poles: poles.length,
          total: allCaptures.length
        },
        approvals: {
          approved: allCaptures.filter(c => c.approvalStatus === 'approved').length,
          pending: allCaptures.filter(c => c.approvalStatus === 'pending').length,
          rejected: allCaptures.filter(c => c.approvalStatus === 'rejected').length
        },
        quality: {
          avgScore: calculateAverageQuality(allCaptures),
          highQuality: allCaptures.filter(c => (c.qualityScore || 0) >= 90).length,
          lowQuality: allCaptures.filter(c => (c.qualityScore || 0) < 70).length
        },
        timeline: {
          avgApprovalTime: calculateAverageApprovalTime(allCaptures),
          oldestPending: getOldestPending(allCaptures)
        }
      };
    }

    // Generate Detailed Report
    if (type === 'detailed' || type === 'all') {
      reportData.detailed = {
        daily: generateDailyBreakdown(allCaptures, days),
        byContractor: generateContractorBreakdown(allCaptures),
        byProject: generateProjectBreakdown(allCaptures),
        issues: generateIssuesReport(allCaptures)
      };
    }

    // Generate Performance Report
    if (type === 'performance' || type === 'all') {
      reportData.performance = {
        contractors: await generateContractorPerformance(allCaptures),
        projects: generateProjectPerformance(allCaptures),
        trends: generateTrendAnalysis(allCaptures, days)
      };
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      generatedAt: new Date().toISOString(),
      recordCount: allCaptures.length
    });

  } catch (error: unknown) {
    console.error('Completion reports API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate completion reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions for report generation
function calculateAverageQuality(captures: any[]): number {
  const withQuality = captures.filter(c => c.qualityScore);
  if (withQuality.length === 0) return 0;
  
  const sum = withQuality.reduce((acc, c) => acc + c.qualityScore, 0);
  return Math.round(sum / withQuality.length);
}

function calculateAverageApprovalTime(captures: any[]): number {
  const approved = captures.filter(c => c.approvedAt && c.capturedAt);
  if (approved.length === 0) return 0;
  
  const totalHours = approved.reduce((acc, c) => {
    const diffMs = c.approvedAt.getTime() - c.capturedAt.getTime();
    return acc + (diffMs / (1000 * 60 * 60)); // Convert to hours
  }, 0);
  
  return Math.round(totalHours / approved.length);
}

function getOldestPending(captures: any[]): number {
  const pending = captures.filter(c => c.approvalStatus === 'pending');
  if (pending.length === 0) return 0;
  
  const oldest = pending.reduce((oldest, c) => {
    return c.capturedAt < oldest.capturedAt ? c : oldest;
  });
  
  const daysSince = (Date.now() - oldest.capturedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(daysSince);
}

function generateDailyBreakdown(captures: any[], days: number): any[] {
  const dailyData = {};
  
  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = {
      date: dateKey,
      total: 0,
      homeDrops: 0,
      poles: 0,
      approved: 0,
      pending: 0,
      rejected: 0
    };
  }
  
  // Populate with actual data
  captures.forEach(capture => {
    const dateKey = capture.capturedAt.toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].total++;
      dailyData[dateKey][capture.type === 'home_drop' ? 'homeDrops' : 'poles']++;
      dailyData[dateKey][capture.approvalStatus || 'pending']++;
    }
  });
  
  return Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

function generateContractorBreakdown(captures: any[]): any[] {
  const contractorData = {};
  
  captures.forEach(capture => {
    const contractorId = capture.contractorId || 'unknown';
    if (!contractorData[contractorId]) {
      contractorData[contractorId] = {
        contractorId,
        total: 0,
        homeDrops: 0,
        poles: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        avgQuality: 0,
        qualityScores: []
      };
    }
    
    const data = contractorData[contractorId];
    data.total++;
    data[capture.type === 'home_drop' ? 'homeDrops' : 'poles']++;
    data[capture.approvalStatus || 'pending']++;
    
    if (capture.qualityScore) {
      data.qualityScores.push(capture.qualityScore);
    }
  });
  
  // Calculate average quality for each contractor
  Object.values(contractorData).forEach((data: any) => {
    if (data.qualityScores.length > 0) {
      data.avgQuality = Math.round(
        data.qualityScores.reduce((sum, score) => sum + score, 0) / data.qualityScores.length
      );
    }
    delete data.qualityScores; // Remove raw scores from output
  });
  
  return Object.values(contractorData).sort((a: any, b: any) => b.total - a.total);
}

function generateProjectBreakdown(captures: any[]): any[] {
  const projectData = {};
  
  captures.forEach(capture => {
    const projectId = capture.projectId || 'unknown';
    if (!projectData[projectId]) {
      projectData[projectId] = {
        projectId,
        total: 0,
        homeDrops: 0,
        poles: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      };
    }
    
    const data = projectData[projectId];
    data.total++;
    data[capture.type === 'home_drop' ? 'homeDrops' : 'poles']++;
    data[capture.approvalStatus || 'pending']++;
  });
  
  return Object.values(projectData).sort((a: any, b: any) => b.total - a.total);
}

function generateIssuesReport(captures: any[]): any {
  const rejected = captures.filter(c => c.approvalStatus === 'rejected');
  const issuesCount = {};
  
  rejected.forEach(capture => {
    if (capture.rejection && capture.rejection.issues) {
      capture.rejection.issues.forEach(issue => {
        issuesCount[issue] = (issuesCount[issue] || 0) + 1;
      });
    }
    
    // Count rejection reasons
    if (capture.rejection && capture.rejection.reason) {
      const reason = capture.rejection.reason;
      issuesCount[reason] = (issuesCount[reason] || 0) + 1;
    }
  });
  
  return {
    totalRejected: rejected.length,
    commonIssues: Object.entries(issuesCount)
      .map(([issue, count]) => ({ issue, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10) // Top 10 issues
  };
}

async function generateContractorPerformance(captures: any[]): Promise<any[]> {
  const contractors = generateContractorBreakdown(captures);
  
  return contractors.map(contractor => ({
    ...contractor,
    approvalRate: contractor.total > 0 ? ((contractor.approved / contractor.total) * 100).toFixed(1) : '0.0',
    rejectionRate: contractor.total > 0 ? ((contractor.rejected / contractor.total) * 100).toFixed(1) : '0.0',
    performance: calculatePerformanceScore(contractor)
  }));
}

function calculatePerformanceScore(contractor: any): string {
  const approvalRate = contractor.total > 0 ? (contractor.approved / contractor.total) : 0;
  const qualityScore = contractor.avgQuality / 100;
  
  // Weighted performance score (70% approval rate, 30% quality)
  const score = (approvalRate * 0.7) + (qualityScore * 0.3);
  
  if (score >= 0.9) return 'excellent';
  if (score >= 0.8) return 'good';
  if (score >= 0.7) return 'fair';
  return 'needs_improvement';
}

function generateProjectPerformance(captures: any[]): any[] {
  const projects = generateProjectBreakdown(captures);
  
  return projects.map(project => ({
    ...project,
    completionRate: project.total > 0 ? (((project.approved + project.rejected) / project.total) * 100).toFixed(1) : '0.0',
    approvalRate: project.total > 0 ? ((project.approved / project.total) * 100).toFixed(1) : '0.0'
  }));
}

function generateTrendAnalysis(captures: any[], days: number): any {
  const midpoint = Math.floor(days / 2);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - midpoint);
  
  const recent = captures.filter(c => c.capturedAt >= cutoffDate);
  const older = captures.filter(c => c.capturedAt < cutoffDate);
  
  const recentApprovalRate = recent.length > 0 ? (recent.filter(c => c.approvalStatus === 'approved').length / recent.length) : 0;
  const olderApprovalRate = older.length > 0 ? (older.filter(c => c.approvalStatus === 'approved').length / older.length) : 0;
  
  const recentAvgQuality = calculateAverageQuality(recent);
  const olderAvgQuality = calculateAverageQuality(older);
  
  return {
    approvalTrend: {
      recent: (recentApprovalRate * 100).toFixed(1),
      previous: (olderApprovalRate * 100).toFixed(1),
      change: ((recentApprovalRate - olderApprovalRate) * 100).toFixed(1)
    },
    qualityTrend: {
      recent: recentAvgQuality,
      previous: olderAvgQuality,
      change: recentAvgQuality - olderAvgQuality
    },
    volumeTrend: {
      recent: recent.length,
      previous: older.length,
      change: recent.length - older.length
    }
  };
}