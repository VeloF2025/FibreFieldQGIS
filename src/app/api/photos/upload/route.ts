/**
 * Photos Upload API - Handle photo uploads with validation and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

// Photo validation settings
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_DIMENSIONS = { width: 800, height: 600 };

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract metadata
    const photoType = formData.get('type') as string;
    const captureId = formData.get('captureId') as string;
    const userId = formData.get('userId') as string;
    const gpsLocation = formData.get('gpsLocation') as string;
    
    if (!photoType || !captureId || !userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: type, captureId, userId' 
        },
        { status: 400 }
      );
    }

    // Get the photo file
    const photoFile = formData.get('photo') as File;
    if (!photoFile) {
      return NextResponse.json(
        { success: false, error: 'No photo file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(photoFile.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (photoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
        },
        { status: 400 }
      );
    }

    // Validate image dimensions (basic check)
    const buffer = await photoFile.arrayBuffer();
    const quality = await validateImageQuality(buffer, photoFile.type);

    if (!quality.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Image quality check failed: ${quality.reason}` 
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = photoFile.name.split('.').pop() || 'jpg';
    const filename = `${photoType}_${timestamp}.${extension}`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, `captures/${captureId}/photos/${filename}`);
    const snapshot = await uploadBytes(storageRef, buffer);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Create photo metadata record
    const photoMetadata = {
      captureId,
      userId,
      type: photoType,
      filename,
      originalName: photoFile.name,
      size: photoFile.size,
      mimeType: photoFile.type,
      storageRef: snapshot.ref.fullPath,
      downloadURL,
      uploadedAt: Timestamp.now(),
      quality: {
        score: quality.score,
        width: quality.width,
        height: quality.height,
        fileSize: photoFile.size
      },
      gpsLocation: gpsLocation ? JSON.parse(gpsLocation) : null,
      status: 'uploaded',
      processed: false
    };

    const photoDoc = await addDoc(collection(db, 'photos'), photoMetadata);

    // Return success response with photo data
    return NextResponse.json({
      success: true,
      data: {
        id: photoDoc.id,
        ...photoMetadata,
        uploadedAt: photoMetadata.uploadedAt.toDate().toISOString()
      },
      message: 'Photo uploaded successfully'
    });

  } catch (error: unknown) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload photo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to validate image quality
async function validateImageQuality(buffer: ArrayBuffer, mimeType: string): Promise<{
  valid: boolean;
  reason?: string;
  score: number;
  width?: number;
  height?: number;
}> {
  try {
    // Basic validation - in production, you'd use a proper image processing library
    // For now, just check if it's a valid image buffer
    const uint8Array = new Uint8Array(buffer);
    
    // Check for valid image headers
    let isValid = false;
    if (mimeType === 'image/jpeg' && uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
      isValid = true;
    } else if (mimeType === 'image/png' && uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
      isValid = true;
    } else if (mimeType === 'image/webp' && 
               uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && 
               uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
      isValid = true;
    }

    if (!isValid) {
      return { valid: false, reason: 'Invalid image format', score: 0 };
    }

    // Calculate basic quality score (0-100)
    let qualityScore = 70; // Base score

    // Size-based scoring
    const sizeKB = buffer.byteLength / 1024;
    if (sizeKB > 500) qualityScore += 10; // Good file size
    if (sizeKB > 1000) qualityScore += 10; // Excellent file size
    if (sizeKB < 100) qualityScore -= 20; // Too small, likely low quality

    // In production, you would also check:
    // - Image dimensions
    // - Color depth
    // - Compression artifacts
    // - Focus/blur detection
    // - Exposure levels

    return {
      valid: true,
      score: Math.min(100, Math.max(0, qualityScore)),
      width: 1920, // Placeholder - would get from actual image analysis
      height: 1080 // Placeholder - would get from actual image analysis
    };

  } catch (error) {
    return { 
      valid: false, 
      reason: 'Failed to analyze image', 
      score: 0 
    };
  }
}