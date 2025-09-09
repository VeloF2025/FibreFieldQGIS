/**
 * Analytics Summary API - Provide project analytics and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project');
    const contractorId = searchParams.get('contractor');
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startTimestamp = Timestamp.fromDate(startDate);

    // Base queries
    let poleQuery = query(collection(db, 'pole_captures'));
    let submissionQuery = query(collection(db, 'pole_submissions'));

    // Apply filters
    if (projectId) {
      poleQuery = query(
        collection(db, 'pole_captures'),
        where('projectId', '==', projectId),
        where('capturedAt', '>=', startTimestamp)
      );
      submissionQuery = query(
        collection(db, 'pole_submissions'),
        where('projectId', '==', projectId),
        where('submittedAt', '>=', startTimestamp)
      );
    }

    if (contractorId && projectId) {
      poleQuery = query(
        collection(db, 'pole_captures'),
        where('projectId', '==', projectId),
        where('contractorId', '==', contractorId),
        where('capturedAt', '>=', startTimestamp)
      );
    }

    // Fetch data
    const [poleSnapshot, submissionSnapshot] = await Promise.all([
      getDocs(poleQuery),
      getDocs(submissionQuery)
    ]);

    // Process pole captures
    const poles = poleSnapshot.docs.map(doc => doc.data());
    const submissions = submissionSnapshot.docs.map(doc => doc.data());

    // Calculate metrics
    const totalPoles = poles.length;
    const completedPoles = poles.filter(p => p.status === 'completed').length;
    const pendingPoles = poles.filter(p => p.status === 'pending').length;
    const errorPoles = poles.filter(p => p.status === 'error').length;

    const totalSubmissions = submissions.length;
    const successfulSubmissions = submissions.filter(s => s.status === 'completed').length;
    const processingSubmissions = submissions.filter(s => s.status === 'processing').length;

    // Calculate daily breakdown
    const dailyStats = {};
    poles.forEach(pole => {
      if (pole.capturedAt) {
        const date = pole.capturedAt.toDate().toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { completed: 0, total: 0 };
        }
        dailyStats[date].total++;
        if (pole.status === 'completed') {
          dailyStats[date].completed++;
        }
      }
    });

    // Quality metrics
    const totalPhotos = poles.reduce((sum, pole) => sum + (pole.photos?.length || 0), 0);
    const avgPhotosPerPole = totalPoles > 0 ? totalPhotos / totalPoles : 0;
    const avgAccuracy = poles.reduce((sum, pole) => sum + (pole.gpsLocation?.accuracy || 0), 0) / totalPoles || 0;

    const analytics = {
      summary: {
        totalPoles,
        completedPoles,
        pendingPoles,
        errorPoles,
        completionRate: totalPoles > 0 ? (completedPoles / totalPoles * 100).toFixed(1) : '0.0',
        successRate: totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions * 100).toFixed(1) : '0.0'
      },
      submissions: {
        total: totalSubmissions,
        successful: successfulSubmissions,
        processing: processingSubmissions,
        failed: totalSubmissions - successfulSubmissions - processingSubmissions
      },
      quality: {
        avgPhotosPerPole: avgPhotosPerPole.toFixed(1),
        avgGpsAccuracy: avgAccuracy.toFixed(1),
        totalPhotos
      },
      timeline: {
        period: `${days} days`,
        dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          ...stats
        })).sort((a, b) => a.date.localeCompare(b.date))
      },
      filters: {
        projectId,
        contractorId,
        days,
        startDate: startDate.toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      generatedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}