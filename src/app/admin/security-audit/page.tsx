'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { securityAuditService, type SecurityAuditReport, type SecurityFinding } from '@/services/security-audit.service';
import { log } from '@/lib/logger';

export default function SecurityAuditPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [auditReport, setAuditReport] = useState<SecurityAuditReport | null>(null);
  const [progress, setProgress] = useState(0);

  const runSecurityAudit = async () => {
    setIsRunning(true);
    setProgress(0);
    setAuditReport(null);

    try {
      log.info('Starting security audit', {}, 'SecurityAuditPage');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 15;
          return next > 85 ? 85 : next;
        });
      }, 800);

      // Execute security audit
      const report = await securityAuditService.executeSecurityAudit('comprehensive');

      clearInterval(progressInterval);
      setProgress(100);
      setAuditReport(report);

      log.info('Security audit completed', { 
        reportId: report.reportId,
        totalFindings: report.findings.length,
        overallRiskScore: report.executionSummary.overallRiskScore
      }, 'SecurityAuditPage');

    } catch (error) {
      log.error('Security audit failed', { error }, 'SecurityAuditPage');
    } finally {
      setIsRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'info': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'open': return 'bg-red-100 text-red-800';
      case 'false-positive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 8) return 'text-red-600';
    if (score >= 6) return 'text-red-500';
    if (score >= 4) return 'text-yellow-600';
    if (score >= 2) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Security Audit Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive security analysis based on OWASP Top 10 and industry best practices
        </p>
      </div>

      {/* Audit Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Security Audit Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runSecurityAudit}
              disabled={isRunning}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRunning ? 'Running Security Audit...' : 'Run Comprehensive Security Audit'}
            </Button>
            
            {isRunning && (
              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Scanning for vulnerabilities...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Summary */}
      {auditReport && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {auditReport.executionSummary.overallRiskScore}/10
                  </div>
                  <div className="text-sm text-gray-600">Overall Risk Score</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {auditReport.executionSummary.complianceScore}%
                  </div>
                  <div className="text-sm text-gray-600">Compliance Score</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {auditReport.executionSummary.totalFindings}
                  </div>
                  <div className="text-sm text-gray-600">Total Findings</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {auditReport.executionSummary.criticalCount + auditReport.executionSummary.highCount}
                  </div>
                  <div className="text-sm text-gray-600">Critical + High</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Severity Breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Security Findings by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {auditReport.executionSummary.criticalCount}
                  </div>
                  <Badge className="bg-red-600 text-white">Critical</Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500 mb-1">
                    {auditReport.executionSummary.highCount}
                  </div>
                  <Badge className="bg-red-100 text-red-800">High</Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    {auditReport.executionSummary.mediumCount}
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {auditReport.executionSummary.lowCount}
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Low</Badge>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600 mb-1">
                    {auditReport.executionSummary.infoCount}
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">Info</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OWASP Top 10 Mapping */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>OWASP Top 10 Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(auditReport.owaspMapping).map(([code, data]) => (
                  <div key={code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{code}: {data.category}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({data.findings} finding{data.findings !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <Badge className={getSeverityColor(data.highestSeverity)}>
                      {data.highestSeverity.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Compliance Checks */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Compliance Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(auditReport.complianceChecks).map(([standard, data]) => (
                  <div key={standard} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 mb-1">
                      {data.score}%
                    </div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {standard.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-600">
                      {data.passed} passed, {data.failed} failed
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Recommendations */}
          {(auditReport.recommendations.immediate.length > 0 || 
            auditReport.recommendations.shortTerm.length > 0) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Priority Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {auditReport.recommendations.immediate.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-700 mb-2">Immediate Actions Required</h4>
                    <div className="space-y-2">
                      {auditReport.recommendations.immediate.map((rec, index) => (
                        <Alert key={index} className="border-red-200 bg-red-50">
                          <AlertDescription className="text-red-800">{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {auditReport.recommendations.shortTerm.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-700 mb-2">Short-term Improvements</h4>
                    <div className="space-y-2">
                      {auditReport.recommendations.shortTerm.map((rec, index) => (
                        <Alert key={index} className="border-yellow-200 bg-yellow-50">
                          <AlertDescription className="text-yellow-800">{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detailed Findings */}
          <Card>
            <CardHeader>
              <CardTitle>Security Findings Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {auditReport.findings.map((finding) => (
                  <div key={finding.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getSeverityColor(finding.severity)}>
                          {finding.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {finding.owaspCategory}
                        </Badge>
                        <Badge className={getStatusColor(finding.status)} variant="outline">
                          {finding.status}
                        </Badge>
                      </div>
                      <div className={`text-sm font-semibold ${getRiskScoreColor(finding.riskScore)}`}>
                        Risk: {finding.riskScore}/10
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      [{finding.id}] {finding.title}
                    </h3>

                    <p className="text-gray-700 mb-3">{finding.description}</p>

                    {finding.location.file && (
                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Location:</span> {finding.location.file}
                        {finding.location.function && ` → ${finding.location.function}`}
                        {finding.location.line && ` (line ${finding.location.line})`}
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Impact</h4>
                        <p className="text-sm text-gray-700">{finding.impact}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Likelihood</h4>
                        <p className="text-sm text-gray-700 capitalize">{finding.likelihood}</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-medium text-blue-900 mb-2">Remediation</h4>
                      <p className="text-sm text-blue-800 mb-2">{finding.remediation.recommendation}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-blue-700">
                        <span>Timeline: <strong>{finding.remediation.timeline}</strong></span>
                        <span>Effort: <strong>{finding.remediation.effort}</strong></span>
                      </div>
                      
                      {finding.remediation.steps.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-blue-900 mb-1">Steps:</div>
                          <ol className="text-xs text-blue-800 space-y-1">
                            {finding.remediation.steps.map((step, index) => (
                              <li key={index} className="flex">
                                <span className="mr-2">{index + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Audit Metadata */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Audit Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Report ID:</span> {auditReport.reportId}
                </div>
                <div>
                  <span className="font-medium">Audit Type:</span> {auditReport.auditType}
                </div>
                <div>
                  <span className="font-medium">Generated:</span> {auditReport.generatedAt.toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Version:</span> {auditReport.version}
                </div>
                <div>
                  <span className="font-medium">Audited By:</span> {auditReport.auditedBy}
                </div>
                <div>
                  <span className="font-medium">Services Tested:</span> {auditReport.scope.services.length}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}