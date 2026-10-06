import React, { useState } from 'react';
import { FileText, Download, Activity, Shield, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { toCSV, downloadCSV } from '../lib/csv';
import { findProject } from '../lib/projectUtils';

export default function Reports({ stats, dimensionStats, activeDimension = 'country', loading, projects = [], selectedProjectIndex, platform }) {
  const currentProject = findProject(projects, selectedProjectIndex, platform) || { name: 'App' };
  const [copiedKey, setCopiedKey] = useState(null);

  const handleExportOverview = () => {
    if (!stats) return;
    const columns = ['totalInstallCountByUser', 'totalUninstallCountByUser', 'currentlyActiveDevices', 'totalDailyUserInstalls', 'totalDailyUserUninstalls'];
    const csv = toCSV([stats], columns);
    downloadCSV(`${currentProject.name}_overview.csv`, csv);
  };

  const handleExportTrends = () => {
    if (!stats || !stats.dailyTrends || stats.dailyTrends.length === 0) return;
    const columns = Object.keys(stats.dailyTrends[0]);
    const csv = toCSV(stats.dailyTrends, columns);
    downloadCSV(`${currentProject.name}_trends.csv`, csv);
  };

  const handleExportDimensions = () => {
    if (!dimensionStats || dimensionStats.length === 0) return;
    const columns = Object.keys(dimensionStats[0]);
    const csv = toCSV(dimensionStats, columns);
    downloadCSV(`${currentProject.name}_${activeDimension}.csv`, csv);
  };

  const handleExportArchive = () => {
    if (!stats) return;
    let archiveText = `# AppRankly Data Archive — ${currentProject.name}\n# Exported on ${new Date().toISOString()}\n\n`;
    archiveText += `=== OVERVIEW METRICS ===\n` + toCSV([stats], ['totalInstallCountByUser', 'totalUninstallCountByUser', 'currentlyActiveDevices', 'totalDailyUserInstalls', 'totalDailyUserUninstalls']) + `\n\n`;
    if (stats.dailyTrends && stats.dailyTrends.length > 0) {
      archiveText += `=== DAILY TRENDS ===\n` + toCSV(stats.dailyTrends, Object.keys(stats.dailyTrends[0])) + `\n\n`;
    }
    if (dimensionStats && dimensionStats.length > 0) {
      archiveText += `=== DIMENSION ANALYSIS (${activeDimension}) ===\n` + toCSV(dimensionStats, Object.keys(dimensionStats[0])) + `\n\n`;
    }
    downloadCSV(`${currentProject.name}_full_archive.txt`, archiveText);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const pkgId = currentProject.bundleId || currentProject.packageName || 'com.example.app';
  const effectivePlatform = currentProject.platform || platform || 'google';

  const badgeTypes = [
    { id: 'rating', label: 'Store Rating', metric: 'rating' },
    { id: 'installs', label: 'Store Installs', metric: 'installs' },
    { id: 'version', label: 'Latest Version', metric: 'version' },
    { id: 'reviews', label: 'Total Ratings', metric: 'reviews' }
  ];

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-full text-slate-400 text-xs py-12">
      <Activity className="animate-spin text-accent-blue mr-2" size={18} />
      <span>Preparing report data...</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-bold text-white">Reports & Data Exports</h2>
        <p className="text-xs text-white/40">Download raw metrics and structured analytics for offline analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard
          title="Overview Stats"
          description="Summary of installs, uninstalls, and active devices for the selected period."
          onDownload={handleExportOverview}
          disabled={!stats}
        />
        <ReportCard
          title="Daily Trends"
          description="A day-by-day breakdown of all key performance metrics."
          onDownload={handleExportTrends}
          disabled={!stats}
        />
        <ReportCard
          title={`Dimension: ${activeDimension.replace('_', ' ')}`}
          description="Granular breakdown for the currently selected dimension."
          onDownload={handleExportDimensions}
          disabled={!dimensionStats}
        />
        <ReportCard
          title="Full Data Archive Bundle"
          description="Download all overview, trend, and dimension datasets in a single bundle."
          onDownload={handleExportArchive}
          disabled={!stats}
          highlight={true}
        />
      </div>

      {/* Embeddable SVG Badges Section */}
      <div className="glass-card p-6 border border-white/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="text-accent-blue" size={20} />
              Embeddable Status Shields & README Badges
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live, dynamic SVG badges for your GitHub README, landing page, or documentation. Shields auto-update directly from store data.
            </p>
          </div>
          <span className="self-start md:self-auto text-[11px] font-mono bg-white/5 text-slate-300 px-3 py-1 rounded-full border border-white/10">
            Target: <strong className="text-white">{pkgId}</strong> ({effectivePlatform})
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {badgeTypes.map(b => {
            const badgeUrl = `${window.location.origin}/api/badge/${effectivePlatform}/${pkgId}/${b.metric}.svg`;
            const markdown = `[![${b.label}](${badgeUrl})](${currentProject.storeUrl || badgeUrl})`;
            const html = `<img src="${badgeUrl}" alt="${b.label}" />`;

            return (
              <div key={b.id} className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">{b.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">/api/badge/{effectivePlatform}/{pkgId}/{b.metric}.svg</span>
                  </div>
                  <div className="bg-black/40 px-2 py-1.5 rounded-lg border border-white/5 flex items-center justify-center">
                    <img
                      src={`/api/badge/${effectivePlatform}/${pkgId}/${b.metric}.svg`}
                      alt={b.label}
                      className="h-5"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => handleCopy(markdown, `md-${b.id}`)}
                    className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium border border-white/5"
                  >
                    {copiedKey === `md-${b.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-slate-400" />}
                    <span>{copiedKey === `md-${b.id}` ? 'Copied MD!' : 'Copy Markdown'}</span>
                  </button>

                  <button
                    onClick={() => handleCopy(html, `html-${b.id}`)}
                    className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium border border-white/5"
                  >
                    {copiedKey === `html-${b.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-slate-400" />}
                    <span>{copiedKey === `html-${b.id}` ? 'Copied HTML!' : 'Copy HTML'}</span>
                  </button>

                  <a
                    href={`/api/badge/${effectivePlatform}/${pkgId}/${b.metric}.svg`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                    title="Open SVG in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, description, onDownload, disabled, highlight = false }) {
  return (
    <div className={`glass-card p-6 flex flex-col justify-between ${highlight ? 'border border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 to-slate-900/40' : ''}`}>
      <div>
        <h3 className="font-bold mb-2 flex items-center text-white text-sm">
          <FileText className={`mr-2 ${highlight ? 'text-indigo-400' : 'text-accent-blue'}`} size={18} />
          {title}
        </h3>
        <p className="text-xs text-white/40 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onDownload}
        disabled={disabled}
        className={`mt-4 w-full py-2 flex items-center justify-center space-x-2 rounded-xl font-bold text-xs uppercase transition-all ${
          disabled
            ? 'bg-white/5 text-white/20 cursor-not-allowed'
            : highlight
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
        }`}
      >
        <Download size={14} />
        <span>Download Report</span>
      </button>
    </div>
  );
}

