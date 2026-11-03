
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  CalendarDays,
  BarChart3,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

import {
  Card,
  Badge,
  Button,
  PageHeader,
  EmptyState,
  Field,
  Skeleton,
} from '../../components/ui';

import {
  VolumeChart,
  StatusChart,
  DepartmentChart,
} from '../../components/charts/AnalyticsCharts';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import analyticsApi from '../../api/analyticsApi';
import axiosClient from '../../api/axiosClient';
import { isMockMode } from '../../api/mode';
import MockReportsPage from '../mock/MockReportsPage';

// -------------------------------
// Helpers
// -------------------------------

const statusColors = {
  PENDING_CLASSIFICATION: '#94a3b8',
  OPEN: '#4a70ed',
  IN_PROGRESS: '#f59e0b',
  ESCALATED: '#ef4444',
  RESOLVED: '#0fb68a',
  CLOSED: '#64748b',
};

const routingColors = {
  Classified: '#4a70ed',
  'Pending Classification': '#f59e0b',
  'Manual Review': '#ef4444',
  Unassigned: '#94a3b8',
};

function todayISO() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'UTC',
  });
}

function daysAgoISO(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

function dateLabel(value) {
  if (!value) return '';

  return new Date(`${value}T00:00:00Z`).toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }
  );
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return `${Number(value).toFixed(2)}${suffix}`;
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  return error?.message || 'Unable to load report data.';
}

// -------------------------------
// Main Page
// -------------------------------

export default function ReportsPage(props) {
  if (isMockMode && !props.preview) {
    return <MockReportsPage />;
  }

  return <OriginalReportsPage {...props} />;
}

function OriginalReportsPage({
  role,
  preview = false,
  demoData,
}) {
  const [from, setFrom] = useState(daysAgoISO(29));
  const [to, setTo] = useState(todayISO());

  const [filters, setFilters] = useState({
    date_from: daysAgoISO(29),
    date_to: todayISO(),
  });

  const isLiveAdmin = role === 'ADMIN' && !preview;
  const isLiveStaff = !preview && ['FINANCE_STAFF', 'EXAM_STAFF', 'IT_STAFF'].includes(role);
  const isLiveReports = isLiveAdmin || isLiveStaff;
  const validPeriod = Boolean(from && to && from <= to);

  // One report schema, scoped by JWT on the backend.
  const reportsQuery = useQuery({
    queryKey: [
      'reports', role,
      filters.date_from,
      filters.date_to,
    ],
    queryFn: async () => {
      if (isLiveAdmin) return analyticsApi.getReports(filters);
      const { data } = await axiosClient.get('/staff/reports', { params: filters });
      return data;
    },
    enabled: isLiveReports,
    retry: false,
  });

  const report = reportsQuery.data;
  const summary = report?.summary;

  const title =
    (role === 'HOD' || isLiveStaff)
      ? 'Department reports'
      : 'Analytics & reports';

  // -------------------------------
  // Query Volume data
  // -------------------------------

  const volumeData = (report?.query_volume ?? []).map(
    item => ({
      day: dateLabel(item.date),
      queries: item.received ?? 0,
      resolved: item.resolved ?? 0,
    })
  );

  // -------------------------------
  // Resolution Distribution data
  // -------------------------------

  const statusData = (
    report?.resolution_distribution ?? []
  ).map(item => ({
    name: item.status
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()),

    value: item.count ?? 0,

    color:
      statusColors[item.status] ?? '#64748b',
  }));

  // -------------------------------
  // Department Performance data
  // -------------------------------

  const departmentData = (
    report?.department_performance ?? []
  ).map(item => ({
    name: item.department_name || 'Unassigned',
    value: item.total ?? 0,
    resolved: item.resolved ?? 0,
    open: item.open ?? 0,
  }));

  // -------------------------------
  // AI Routing Distribution
  // -------------------------------

  const routingData =
    report?.ai_routing_distribution ?? [];

  const routingTotal = routingData.reduce(
    (sum, item) => sum + (item.value ?? 0),
    0
  );

  // -------------------------------
  // Resolution Trends
  // -------------------------------

  const trendData = (
    report?.resolution_trends ?? []
  ).map(item => ({
    day: dateLabel(item.date),
    hours: item.avg_resolution_hours,
  }));

  const hasTrendData = trendData.some(
    item => item.hours !== null &&
            item.hours !== undefined
  );

  function applyPeriod() {
    if (!validPeriod) return;

    setFilters({
      date_from: from,
      date_to: to,
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS THAT MAKE A DIFFERENCE"
        title={title}
        description="Turn campus conversations into a clearer picture."
        actions={
          <>
            <Button
              variant="secondary"
              disabled
              title="PDF export API is not implemented yet"
            >
              <Download size={15} />
              Export PDF
            </Button>

            <Button
              disabled
              title="Excel export API is not implemented yet"
            >
              <Download size={15} />
              Export Excel
            </Button>
          </>
        }
      />

      {/* API Connection Status */}
      <Card className="padded-card">
        {preview ? (
          <Badge tone="blue">Demo data</Badge>
        ) : reportsQuery.isLoading ? (
          <p>Loading analytics from CampusIQ...</p>
        ) : reportsQuery.isError ? (
          <>
            <h3>Unable to load analytics</h3>
            <p className="muted">
              {getErrorMessage(reportsQuery.error)}
            </p>
          </>
        ) : isLiveReports && report ? (
          <>
            <Badge tone="green">Live API connected</Badge>
            <p className="muted">
              Reporting period: {report.period?.date_from}
              {' to '}
              {report.period?.date_to}
            </p>
          </>
        ) : (
          <p className="muted">
            Analytics are currently available for
            Administrator accounts.
          </p>
        )}
      </Card>

      {/* Date Filters */}
      <Card className="report-filters">
        <CalendarDays size={20} />

        <Field label="From" htmlFor="report-from">
          <input
            id="report-from"
            type="date"
            value={from}
            onChange={event => setFrom(event.target.value)}
          />
        </Field>

        <Field label="To" htmlFor="report-to">
          <input
            id="report-to"
            type="date"
            min={from}
            value={to}
            onChange={event => setTo(event.target.value)}
          />
        </Field>

        <Button
          variant="secondary"
          disabled={
            !validPeriod ||
            !isLiveReports ||
            reportsQuery.isFetching
          }
          onClick={applyPeriod}
        >
          {reportsQuery.isFetching
            ? 'Loading...'
            : 'Set reporting period'}
        </Button>
      </Card>

      {/* Summary Metrics */}
      {isLiveReports && summary && (
        <Card className="padded-card">
          <h2>Reporting summary</h2>

          <div className="report-highlights">
            <div>
              <small>Total queries</small>
              <strong>{summary.total_queries}</strong>
            </div>

            <div>
              <small>Open queries</small>
              <strong>{summary.open_queries}</strong>
            </div>

            <div>
              <small>Resolved queries</small>
              <strong>{summary.resolved_queries}</strong>
            </div>

            <div>
              <small>Resolution rate</small>
              <strong>
                {formatNumber(summary.resolution_rate, '%')}
              </strong>
            </div>
          </div>
        </Card>
      )}

      {/* Query Volume + Resolution Distribution */}
      <div className="dashboard-chart-grid">

        <Card>
          <div className="card-heading">
            <div>
              <h2>Query volume</h2>
              <p>
                Received and resolved conversations over time.
              </p>
            </div>
          </div>

          {preview && demoData?.volume ? (
            <VolumeChart data={demoData.volume} />

          ) : reportsQuery.isLoading && isLiveReports ? (
            <Skeleton rows={4} />

          ) : isLiveReports && report ? (
            <VolumeChart
              data={volumeData}
              local
            />

          ) : (
            <EmptyState
              title="No report data available"
              icon={BarChart3}
            />
          )}
        </Card>

        <Card>
          <div className="card-heading">
            <div>
              <h2>Resolution distribution</h2>
              <p>Follow the outcome of every query.</p>
            </div>
          </div>

          {preview && demoData?.statuses ? (
            <StatusChart data={demoData.statuses} />

          ) : isLiveReports && report && statusData.length ? (
            <StatusChart
              data={statusData}
              local
              resolutionRate={summary?.resolution_rate}
            />

          ) : (
            <EmptyState
              title="No resolution data available"
            />
          )}
        </Card>

      </div>

      {/* Department Performance + AI Routing */}
      <div className="dashboard-chart-grid">

        <Card>
          <div className="card-heading">
            <div>
              <h2>Department performance</h2>
              <p>{isLiveStaff ? 'Performance within your department.' : 'Compare query volume across departments.'}</p>
            </div>
          </div>

          {preview && demoData?.departmentsChart ? (
            <DepartmentChart
              data={demoData.departmentsChart}
            />

          ) : isLiveReports && report && departmentData.length ? (
            <DepartmentChart
              data={departmentData}
              local
            />

          ) : (
            <EmptyState
              title="No department statistics available"
            />
          )}
        </Card>

        <Card className="padded-card">
          <h2>AI routing distribution</h2>

          <p className="muted">
            Classification and routing outcomes.
          </p>

          {isLiveReports && report && routingData.length ? (
            <div className="routing-bars">
              {routingData.map(item => {
                const percentage = routingTotal
                  ? (item.value / routingTotal) * 100
                  : 0;

                return (
                  <div key={item.name}>
                    <span>
                      {item.name}
                      <b>
                        {item.value} queries
                        {' · '}
                        {percentage.toFixed(1)}%
                      </b>
                    </span>

                    <div>
                      <i
                        style={{
                          width: `${percentage}%`,
                          background:
                            routingColors[item.name] ??
                            '#4a70ed',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          ) : preview ? (
            <Badge>Demo data</Badge>

          ) : (
            <EmptyState
              title="Routing insights unavailable"
              icon={Sparkles}
            />
          )}
        </Card>

      </div>

      {/* Resolution Trends + Response Time */}
      <Card className="padded-card">
        <h2>Resolution trends & response time</h2>

        <p className="muted">
          Monitor how efficiently student queries
          receive responses and reach resolution.
        </p>

        {isLiveReports && summary ? (
          <>
            <div className="report-highlights">
              <div>
                <small>Average first response</small>
                <strong>
                  {formatNumber(
                    summary.avg_response_minutes,
                    ' min'
                  )}
                </strong>
              </div>

              <div>
                <small>Average resolution</small>
                <strong>
                  {formatNumber(
                    summary.avg_resolution_hours,
                    ' hrs'
                  )}
                </strong>
              </div>

              <div>
                <small>Resolution rate</small>
                <strong>
                  {formatNumber(
                    summary.resolution_rate,
                    '%'
                  )}
                </strong>
              </div>

              <div>
                <small>Resolved queries</small>
                <strong>
                  {summary.resolved_queries}
                </strong>
              </div>
            </div>

            {hasTrendData ? (
              <div
                className="chart-wrap"
                style={{ height: 280 }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart data={trendData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis
                      allowDecimals
                      tick={{ fontSize: 11 }}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="hours"
                      name="Average resolution (hours)"
                      stroke="#4a70ed"
                      strokeWidth={2}
                      connectNulls={false}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No resolution trends yet"
                description="Resolution trends will appear as queries are resolved."
                icon={BarChart3}
              />
            )}
          </>

        ) : preview ? (
          <div className="report-highlights">
            <div>
              <small>Average first response</small>
              <strong>42 min</strong>
            </div>

            <div>
              <small>Average resolution</small>
              <strong>2.4 hrs</strong>
            </div>
          </div>

        ) : (
          <EmptyState
            title="Response-time analytics unavailable"
            icon={AlertTriangle}
          />
        )}
      </Card>
    </>
  );
}
