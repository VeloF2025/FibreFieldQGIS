'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  Trash2,
  AlertTriangle
} from 'lucide-react';

/**
 * Bulk Actions Component
 * 
 * Provides bulk operations for selected home drop captures.
 * Handles bulk approval, rejection, and export actions.
 * 
 * Line count target: <200 lines
 */

interface Props {
  selectedCount: number;
  onApprove: (reason: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onClearSelection: () => void;
}

export function BulkActionsComponent({ selectedCount, onApprove, onReject, onClearSelection }: Props) {
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkApproval = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(approvalReason || 'Bulk approval by admin');
      setIsApprovalDialogOpen(false);
      setApprovalReason('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk approval failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkRejection = async () => {
    if (!rejectionReason.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onReject(rejectionReason);
      setIsRejectionDialogOpen(false);
      setRejectionReason('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk rejection failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportSelected = () => {
    // TODO: Implement export functionality
    console.log(`Exporting ${selectedCount} selected captures`);
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <span>{selectedCount} capture{selectedCount !== 1 ? 's' : ''} selected</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Approval */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-green-700 border-green-700 hover:bg-green-50">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Bulk Approve {selectedCount} Captures
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    You are about to approve {selectedCount} home drop capture{selectedCount !== 1 ? 's' : ''}. 
                    This action cannot be undone.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Approval Notes (Optional)</label>
                    <Textarea
                      placeholder="Add notes for this bulk approval..."
                      value={approvalReason}
                      onChange={(e) => setApprovalReason(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsApprovalDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkApproval}
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? 'Approving...' : `Approve ${selectedCount} Captures`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bulk Rejection */}
            <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-700 border-red-700 hover:bg-red-50">
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Bulk Reject {selectedCount} Captures
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">Warning</p>
                      <p className="text-sm text-red-700">
                        You are about to reject {selectedCount} captures. Please provide a clear reason 
                        that technicians can use to improve their future submissions.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-700">Rejection Reason *</label>
                    <Textarea
                      placeholder="Please explain why these captures are being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      className="resize-none border-red-200 focus:border-red-400"
                      required
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsRejectionDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkRejection}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      variant="destructive"
                    >
                      {isSubmitting ? 'Rejecting...' : `Reject ${selectedCount} Captures`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={handleExportSelected}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            {/* Clear Selection */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearSelection}
              className="text-gray-600"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}