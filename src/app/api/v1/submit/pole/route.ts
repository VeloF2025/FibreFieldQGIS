/**
 * Pole Submission API - Handle pole capture submissions with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    if (!storage) {
      return NextResponse.json(
        { success: false, error: 'Storage connection not available' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    
    // Extract pole data
    const poleDataString = formData.get('poleData') as string;
    if (!poleDataString) {
      return NextResponse.json(
        { success: false, error: 'Missing pole data' },
        { status: 400 }
      );
    }

    const poleData = JSON.parse(poleDataString);
    
    // Validate required fields
    const requiredFields = ['projectId', 'contractorId', 'poleNumber', 'gpsLocation'];
    for (const field of requiredFields) {
      if (!poleData[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create submission record
    const submissionData = {
      ...poleData,
      status: 'processing',
      submittedAt: Timestamp.now(),
      photos: [],
      validation: {
        gpsAccuracy: poleData.gpsLocation?.accuracy || 0,
        photoCount: 0,
        requiredPhotos: ['before', 'front', 'side', 'depth', 'concrete', 'compaction']
      }
    };

    const submissionRef = await addDoc(collection(db, 'pole_submissions'), submissionData);
    const submissionId = submissionRef.id;

    // Process photos if provided
    const photos = [];
    const photoTypes = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
    
    for (const photoType of photoTypes) {
      const photoFile = formData.get(`photo_${photoType}`) as File;
      if (photoFile) {
        try {
          // Upload photo to Firebase Storage
          const photoRef = ref(storage, `poles/${submissionId}/photos/${photoType}_${Date.now()}.jpg`);
          const snapshot = await uploadBytes(photoRef, photoFile);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          photos.push({
            type: photoType,
            url: downloadURL,
            filename: photoFile.name,
            size: photoFile.size,
            uploadedAt: Timestamp.now()
          });
        } catch (uploadError) {
          log.error(`Failed to upload ${photoType} photo:`, {}, "Route", uploadError as Error);
        }
      }
    }

    // Update submission with photo data
    await updateDoc(submissionRef, {
      photos,
      'validation.photoCount': photos.length,
      status: photos.length >= 6 ? 'completed' : 'incomplete',
      processedAt: Timestamp.now()
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionId,
        status: photos.length >= 6 ? 'completed' : 'incomplete',
        photosUploaded: photos.length,
        requiredPhotos: 6,
        photos: photos.map(p => ({ type: p.type, uploaded: true }))
      }
    });

  } catch (error: unknown) {
    log.error('Pole submission error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit pole capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Missing submission ID' },
        { status: 400 }
      );
    }

    const submissionDoc = await getDoc(doc(db, 'pole_submissions', submissionId));
    
    if (!submissionDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    const data = submissionDoc.data();
    return NextResponse.json({
      success: true,
      data: {
        id: submissionDoc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString(),
        processedAt: data.processedAt?.toDate?.()?.toISOString()
      }
    });

  } catch (error: unknown) {
    log.error('Get submission error:', {}, "Route", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get submission status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}