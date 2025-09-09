'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { integrationTestService, type IntegrationTestReport, type TestSuiteConfig } from '@/services/integration-test.service';
import { log } from '@/lib/logger';

export default function IntegrationTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState<IntegrationTestReport | null>(null);
  const [progress, setProgress] = useState(0);

  const runIntegrationTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestReport(null);

    try {
      log.info('Starting integration tests', {}, 'IntegrationTestPage');

      // Configure test suite
      const testConfig: TestSuiteConfig = {
        suiteName: 'FibreField Core Integration Tests',
        description: 'Comprehensive integration testing for all core services and workflows',
        categories: ['workflow', 'service', 'data', 'performance'],
        parallel: false,
        timeout: 30000, // 30 seconds per test
        retries: 1,
        environment: 'development',
        mockData: true,
        cleanup: true
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 10;
          return next > 90 ? 90 : next;
        });
      }, 500);

      // Execute test suite
      const report = await integrationTestService.executeTestSuite(testConfig);

      clearInterval(progressInterval);
      setProgress(100);
      setTestReport(report);

      log.info('Integration tests completed', { 
        totalTests: report.results.length,
        passed: report.executionSummary.passed,
        failed: report.executionSummary.failed
      }, 'IntegrationTestPage');

    } catch (error) {
      log.error('Integration tests failed', { error }, 'IntegrationTestPage');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'skipped': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Integration Testing Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive testing of service integrations and workflows
        </p>
      </div>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={runIntegrationTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? 'Running Tests...' : 'Run Integration Tests'}
            </Button>
            
            {isRunning && (
              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results Summary */}
      {testReport && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {testReport.executionSummary.totalTests}
                  </div>
                  <div className="text-sm text-gray-600">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testReport.executionSummary.passed}
                  </div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testReport.executionSummary.failed}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {testReport.executionSummary.warnings}
                  </div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testReport.executionSummary.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Execution Details</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Duration:</span>{' '}
                    {formatDuration(testReport.executionSummary.totalDuration)}
                  </div>
                  <div>
                    <span className="font-medium">Average Duration:</span>{' '}
                    {formatDuration(testReport.executionSummary.averageDuration)}
                  </div>
                  <div>
                    <span className="font-medium">Generated:</span>{' '}
                    {testReport.generatedAt.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Environment:</span>{' '}
                    {testReport.suiteConfig.environment}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testReport.results.map((result, index) => (
                  <div key={result.testId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{result.testName}</span>
                        <Badge className={getStatusColor(result.status)}>
                          {result.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDuration(result.executionTime)}
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      {result.details.description}
                    </div>

                    {/* Steps */}
                    {result.details.steps && result.details.steps.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Steps:</div>
                        <div className="space-y-1">
                          {result.details.steps.map((step, stepIndex) => (
                            <div key={stepIndex} className="flex items-center gap-2 text-sm">
                              <Badge 
                                size="sm" 
                                className={getStatusColor(step.status)}
                              >
                                {step.status}
                              </Badge>
                              <span>{step.step}</span>
                              <span className="text-gray-500">
                                ({formatDuration(step.duration)})
                              </span>
                              {step.details && (
                                <span className="text-gray-600 italic">
                                  - {step.details}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assertions */}
                    {result.details.assertions && result.details.assertions.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Assertions:</div>
                        <div className="space-y-1">
                          {result.details.assertions.map((assertion, assertionIndex) => (
                            <div key={assertionIndex} className="flex items-center gap-2 text-sm">
                              <Badge 
                                size="sm" 
                                className={assertion.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                              >
                                {assertion.passed ? 'PASS' : 'FAIL'}
                              </Badge>
                              <span>{assertion.assertion}</span>
                              <span className="text-gray-500">
                                (Expected: {String(assertion.expected)}, Actual: {String(assertion.actual)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {result.errorMessage && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <div className="font-medium">Error:</div>
                        <div>{result.errorMessage}</div>
                      </div>
                    )}

                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-yellow-700 mb-1">Warnings:</div>
                        <div className="space-y-1">
                          {result.warnings.map((warning, warningIndex) => (
                            <div key={warningIndex} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                              {warning}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {result.recommendations.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-blue-700 mb-1">Recommendations:</div>
                        <div className="space-y-1">
                          {result.recommendations.map((recommendation, recIndex) => (
                            <div key={recIndex} className="text-sm text-blue-700 bg-blue-50 p-2 rounded">
                              {recommendation}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Recommendations */}
          {testReport.recommendations.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>System Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testReport.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="text-sm text-gray-700">{recommendation}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}