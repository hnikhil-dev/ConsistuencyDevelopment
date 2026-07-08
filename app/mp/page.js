// app/mp/page.js
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  Sliders, 
  TrendingUp, 
  MapPin, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  Users, 
  ChevronRight, 
  Award, 
  ShieldAlert, 
  Activity,
  FileText,
  Lock,
  Database,
  Briefcase,
  Map,
  ClipboardList,
  Printer,
  Landmark
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Dynamically load Map to prevent Next.js SSR reference errors
const HotspotMap = dynamic(() => import('@/components/HotspotMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full rounded-xl bg-slate-100 flex items-center justify-center border border-slate-300">
      <span className="text-slate-500 font-bold">Loading Interactive Map Canvas...</span>
    </div>
  )
});

// Category badge color mappings for light government layout
const CATEGORY_COLORS = {
  education: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', hex: '#1e40af' },
  roads: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', hex: '#065f46' },
  water: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300', hex: '#075985' },
  health: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', hex: '#9f1239' },
  sanitation: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', hex: '#6b21a8' },
  skill: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', hex: '#92400e' }
};

const CHART_COLORS = ['#1e40af', '#065f46', '#075985', '#9f1239', '#6b21a8', '#92400e'];

const POLICY_PRESETS = {
  standard: { demand: 20, population: 15, gap: 15, equity: 15, urgency: 15, feasibility: 10, alignment: 5, trust: 5 },
  urgency: { demand: 10, population: 10, gap: 15, equity: 10, urgency: 35, feasibility: 5, alignment: 10, trust: 5 },
  equity: { demand: 10, population: 15, gap: 15, equity: 35, urgency: 10, feasibility: 5, alignment: 5, trust: 5 },
  citizen: { demand: 35, population: 5, gap: 10, equity: 10, urgency: 10, feasibility: 10, alignment: 5, trust: 15 }
};

export default function MPDashboard() {
  // Authentication Passcode Gate State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Auto-authenticate if already logged in during this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('mp_authenticated');
      if (auth === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPasscode = process.env.NEXT_PUBLIC_MP_PASSCODE || 'pune123';
    if (passcode === correctPasscode) {
      setIsAuthenticated(true);
      sessionStorage.setItem('mp_authenticated', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid Admin Passcode. Verification failed.');
    }
  };

  const exportToCSV = () => {
    const headers = ["Rank", "Project Title", "Sector", "Location", "Estimated Cost (INR)", "Priority Score", "Status"];
    const rows = filteredProjectsList.map((proj, idx) => [
      idx + 1,
      `"${proj.title.replace(/"/g, '""')}"`,
      proj.category.toUpperCase(),
      `"${proj.ward_name}"`,
      proj.estimated_cost,
      proj.total_score,
      proj.status
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Pune_South_East_Projects_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigation State (CTO Workspace View)
  const [activeTab, setActiveTab] = useState('map'); // map, registry, budget, audit

  // Configurable policy weights
  const [weights, setWeights] = useState(POLICY_PRESETS.standard);
  const [selectedPreset, setSelectedPreset] = useState('standard');

  // Budget Optimization (Seeded in Rupees INR)
  const [budgetLimit, setBudgetLimit] = useState(1300000); // Default ₹13 Lakhs
  const [scenario, setScenario] = useState('max_benefit');

  // Database States
  const [allProjects, setAllProjects] = useState([]);
  const [portfolio, setPortfolio] = useState({ selected: [], deferred: [], totalSpent: 0, remainingBudget: 0 });
  const [stats, setStats] = useState(null);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWard, setSelectedWard] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [activeExplainProject, setActiveExplainProject] = useState(null);

  // Load KPI data and recent logs
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  };

  // Load review queue
  const fetchVerificationQueue = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: queueItems } = await supabase
        .from('extracted_issues')
        .select('*')
        .eq('status', 'pending_review');
      setVerificationQueue(queueItems || []);
    } catch (e) {
      console.error("Error loading verification queue:", e);
    }
  };

  // Dynamic Portfolio calculator
  const fetchScoringAndPortfolio = async () => {
    setLoading(true);
    try {
      const weightString = Object.entries(weights)
        .map(([k, v]) => `${k}:${(v / 100).toFixed(2)}`)
        .join(',');

      const url = `/api/projects?weights=${weightString}&budget=${budgetLimit}&scenario=${scenario}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAllProjects(data.allProjects);
        setPortfolio(data.portfolio);
      }
    } catch (e) {
      console.error("Error calculating scores:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSanctionOrder = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup Blocked: Please enable popups in your browser to print the Sanction Order.");
      return;
    }
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const refNum = `G.O./PUNE/2026/SEC-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsHtml = portfolio.selected.map((proj, idx) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; font-weight: bold; color: #0f172a;">${proj.title}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; text-transform: uppercase; font-size: 11px;">${proj.category}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">Ward ${proj.ward_id}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-weight: bold;">₹${proj.estimated_cost.toLocaleString('en-IN')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-weight: bold; color: #1e3a8a;">${proj.total_score}</td>
      </tr>
    `).join('');

    const pageHtml = `
      <html>
        <head>
          <title>Sanction Order - ${refNum}</title>
          <style>
            @media print {
              body { background-color: #ffffff; color: #000000; }
              .no-print { display: none !important; }
            }
            body {
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              margin: 40px;
              color: #1e293b;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #0f172a;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .emblem {
              height: 80px;
              margin-bottom: 10px;
            }
            .ministry {
              font-size: 15px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0;
            }
            .dept {
              font-size: 18px;
              font-weight: 800;
              margin: 6px 0 0 0;
              color: #1e3a8a;
            }
            .sub-dept {
              font-size: 13px;
              font-weight: bold;
              margin: 5px 0 0 0;
              color: #64748b;
            }
            .order-title {
              text-align: center;
              font-size: 18px;
              font-weight: 900;
              text-decoration: underline;
              margin: 25px 0;
              text-transform: uppercase;
              color: #0f172a;
            }
            .meta-table {
              width: 100%;
              margin-bottom: 20px;
              font-size: 13px;
            }
            .meta-table td {
              padding: 4px 0;
            }
            .p-text {
              font-size: 13.5px;
              text-align: justify;
              margin-bottom: 20px;
              color: #334155;
            }
            .main-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 13px;
            }
            .main-table th {
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              color: #0f172a;
            }
            .summary-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 15px;
              border-radius: 8px;
              margin-top: 25px;
              font-size: 13px;
            }
            .sig-block {
              margin-top: 50px;
              float: right;
              text-align: center;
              width: 250px;
              font-size: 13px;
            }
            .sig-line {
              border-top: 1px solid #94a3b8;
              margin-top: 60px;
              padding-top: 5px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background-color: #1e3a8a; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              🖨️ Print / Save as PDF
            </button>
            <button onclick="window.close()" style="background-color: #64748b; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-left: 10px;">
              Close Window
            </button>
          </div>

          <div class="header">
            <div style="width: 50px; height: 50px; border-radius: 50%; border: 3px double #1e3a8a; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; color: #1e3a8a; background-color: #f8fafc; font-family: sans-serif;">DPC</div>
            <div style="margin: 0; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a;">District Planning Committee</div>
            <h1 class="ministry" style="margin-top: 5px;">Pune South-East Constituency</h1>
            <h2 class="dept">Office of the District Planning Committee</h2>
            <h3 class="sub-dept">Pune South-East Parliamentary Constituency Development Fund (MPLADS)</h3>
          </div>

          <table class="meta-table">
            <tr>
              <td><strong>Order Reference:</strong> ${refNum}</td>
              <td style="text-align: right;"><strong>Date:</strong> ${dateStr}</td>
            </tr>
            <tr>
              <td><strong>Sanctioning Authority:</strong> Member of Parliament (MP), Pune South-East</td>
              <td style="text-align: right;"><strong>Status:</strong> Approved & Sanctioned</td>
            </tr>
          </table>

          <h3 class="order-title">Administrative Approval & Fund Allocation Order</h3>

          <p class="p-text">
            Under the powers vested in the District Planning Authority, administrative approval and financial sanction are hereby accorded for the implementation of the following public development projects. These works have been identified and prioritized based on structured citizen feedback consolidated through the constituency intelligence platform, and validated against ward-level demographic indicators and infrastructure gap data.
          </p>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 5%;">S.No</th>
                <th style="width: 45%;">Project Name & Description</th>
                <th style="width: 15%;">Sector</th>
                <th style="width: 12%;">Location</th>
                <th style="width: 13%;">Sanctioned Cost</th>
                <th style="width: 10%;">Priority Score</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            <h4 style="margin-top: 0; margin-bottom: 10px; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Fund Allocation Summary</h4>
            <table style="width: 100%; border: none;">
              <tr>
                <td><strong>Total Allocated Budget Cap:</strong> ₹${budgetLimit.toLocaleString('en-IN')}</td>
                <td><strong>Total Sanctioned Expenditure:</strong> ₹${portfolio.totalSpent.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td><strong>Unallocated Reserve Balance:</strong> ₹${portfolio.remainingBudget.toLocaleString('en-IN')}</td>
                <td><strong>Active Projects Count:</strong> ${portfolio.selected.length} items</td>
              </tr>
            </table>
          </div>

          <div class="sig-block">
            <div class="sig-line">
              District Planning Officer<br/>
              <span style="font-size: 11px; font-weight: normal; color: #64748b;">Pune District Administration</span>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(pageHtml);
    printWindow.document.close();
  };

  useEffect(() => {
    fetchStats();
    fetchVerificationQueue();
  }, []);

  useEffect(() => {
    fetchScoringAndPortfolio();
  }, [weights, budgetLimit, scenario]);

  const handlePresetChange = (presetName) => {
    setSelectedPreset(presetName);
    if (POLICY_PRESETS[presetName]) {
      setWeights(POLICY_PRESETS[presetName]);
    }
  };

  const handleWeightSlider = (dimension, value) => {
    setSelectedPreset('custom');
    const numericVal = parseInt(value, 10);
    const diff = numericVal - weights[dimension];
    
    const otherKeys = Object.keys(weights).filter(k => k !== dimension);
    const sumOthers = otherKeys.reduce((s, k) => s + weights[k], 0);

    const updatedWeights = { ...weights, [dimension]: numericVal };
    
    if (sumOthers > 0) {
      otherKeys.forEach(k => {
        const share = weights[k] / sumOthers;
        const correction = Math.round(diff * share);
        updatedWeights[k] = Math.max(0, weights[k] - correction);
      });
    }

    const finalSum = Object.values(updatedWeights).reduce((s, v) => s + v, 0);
    if (finalSum !== 100) {
      updatedWeights[otherKeys[0]] += (100 - finalSum);
    }

    setWeights(updatedWeights);
  };

  const handleVerifyQueueItem = async (itemId, category, wardId, details, trust) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase
        .from('extracted_issues')
        .update({ status: 'verified', confidence_score: 0.95 })
        .eq('id', itemId);

      const { data: item } = await supabase
        .from('extracted_issues')
        .select('*')
        .eq('id', itemId)
        .limit(1);

      if (item && item[0]) {
        const { clusterSubmission } = await import('@/lib/clustering');
        const subMock = { id: item[0].submission_id };
        const parsedMock = { category, ward_id: wardId, issue_details: details, trust_score: trust, confidence_score: 0.95, status: 'verified' };
        await clusterSubmission(subMock, parsedMock);
      }

      fetchStats();
      fetchVerificationQueue();
      fetchScoringAndPortfolio();
    } catch (e) {
      console.error("Verification verification failed:", e);
    }
  };

  const handleApproveProject = async (projectId, currentStatus) => {
    const nextStatus = currentStatus === 'Proposed' ? 'Approved' : 'Tendering';
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          action: nextStatus,
          actor: 'MP HNikhil',
          previous_state: currentStatus,
          new_state: nextStatus,
          reason: `Approved based on prioritized data analysis. Score was ranked high.`
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStats();
        fetchScoringAndPortfolio();
      }
    } catch (e) {
      console.error("Project approval request error:", e);
    }
  };

  const filteredProjectsList = allProjects.filter(proj => {
    if (selectedWard && proj.ward_id !== selectedWard) return false;
    if (categoryFilter !== 'all' && proj.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && proj.status !== statusFilter) return false;
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-105 font-sans">
        {/* Top Ashoka Stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-[#f97316] via-white to-[#16a34a]"></div>
        
        <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shrink-0 shadow-sm">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-blue-900">
              पब्लिक प्रायोरिटीज - प्रशासनिक सत्यापन गेट
            </h1>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">MP Office Secure Access Gateway</p>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-250 p-8 rounded-2xl max-w-md w-full shadow-lg space-y-6">
            <div className="text-center space-y-2">
              <Lock className="h-10 w-10 text-[#f97316] mx-auto animate-bounce" />
              <h2 className="text-lg font-black text-blue-900">Administrative Sign-In Required</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Please enter the security passcode to access Pune South-East Constituency Development Planning controls.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">MP Office Passcode / पासवर्ड</label>
                <input 
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (default: pune123)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-blue-900 focus:bg-white transition"
                  required
                />
              </div>

              {authError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-250 text-center">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-black text-sm py-3.5 rounded-xl shadow-md transition"
              >
                Authenticate & Verify Session
              </button>
            </form>

            <div className="text-center border-t pt-4">
              <Link href="/" className="text-xs text-blue-900 hover:text-blue-700 hover:underline font-extrabold">
                &larr; Return to Citizen Intake Form
              </Link>
            </div>
          </div>
        </main>
        
        <footer className="border-t py-4 text-center text-xs text-slate-500 bg-white">
          <p>© 2026 Constituency Development Portal. National Informatics Centre (NIC) Security Shield.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Top Ashoka Stripe */}
      <div className="h-2 w-full bg-gradient-to-r from-[#f97316] via-white to-[#16a34a]"></div>

      {/* Official Government Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 shrink-0 shadow-sm">
            <Landmark className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-blue-900 tracking-tight">
              पब्लिक प्रायोरिटीज - निर्वाचन क्षेत्र विकास योजना
            </h1>
            <h2 className="text-md font-bold text-slate-700">
              People's Priorities - Pune South-East Constituency Planning Portal
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Government of Maharashtra Initiative</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-350">
            <Link 
              href="/"
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 transition"
            >
              Citizen Ingest
            </Link>
            <span className="bg-blue-900 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-sm">
              MP Workspace
            </span>
          </div>
        </div>
      </header>

      {/* RLS Security Banner */}
      <div className="bg-blue-900 text-white px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold shadow-inner">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#f97316]" />
          <span>PostgreSQL Row-Level Security (RLS) Enforced</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            SHA-256 Connection Verified
          </span>
          <span className="bg-blue-800 text-blue-300 border border-blue-700 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
            NIC Security Shield Active
          </span>
        </div>
      </div>

      {/* Navigation Tabs (CTO Layout spacing) */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6">
        <div className="max-w-7xl mx-auto w-full flex overflow-x-auto gap-2 py-1">
          <button
            onClick={() => setActiveTab('map')}
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'map' 
                ? 'border-blue-900 text-blue-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Map className="h-4 w-4" />
            1. Constituency Map & Demographics
          </button>
          
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'registry' 
                ? 'border-blue-900 text-blue-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            2. Project Registry & Weights Config
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'budget' 
                ? 'border-blue-900 text-blue-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            3. Budget Optimizer Scenarios
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'audit' 
                ? 'border-blue-900 text-blue-900' 
                : 'border-transparent text-slate-500 hover:text-slate-700 font-semibold'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            4. AI Ingestion Audit & Logs ({verificationQueue.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* KPI Summary Row (Common) */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Suggestions Ingested</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {stats?.kpis?.totalSubmissions || 0}
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allocated Portfolio Budget</span>
              <p className="text-2xl font-black text-blue-900 mt-1">
                ₹{(stats?.kpis?.totalAllocatedBudget || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verification Queue Status</span>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {verificationQueue.length} pending
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sanctioned Projects Ratio</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {stats?.kpis?.totalProjects ? Math.round(((stats?.kpis?.approvedCount || 0) / stats.kpis.totalProjects) * 100) : 0}%
              </p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* Dynamic Workspace Container */}
        <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm min-h-[500px]">
          
          {/* TAB 1: MAP AND DEMOGRAPHICS */}
          {activeTab === 'map' && (
            <div className="space-y-6">
              <div className="border-b pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-blue-900">Constituency Map & Regional Hotspots</h3>
                  <p className="text-xs text-slate-500">Geographical analysis of requests and indicators across wards.</p>
                </div>
                {selectedWard && (
                  <button 
                    onClick={() => setSelectedWard(null)}
                    className="text-xs text-blue-900 hover:text-blue-700 font-extrabold underline"
                  >
                    Reset Map Filter
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Large Map */}
                <div className="lg:col-span-2">
                  <HotspotMap 
                    wardStats={stats?.wardStats} 
                    onSelectWard={setSelectedWard} 
                    selectedWardId={selectedWard}
                    submissions={stats?.submissions || []}
                  />
                </div>

                {/* Regional Stats */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="border rounded-xl p-4 bg-slate-50">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider border-b pb-2 mb-3">
                      Selected Regional Indicators
                    </h4>
                    {selectedWard ? (
                      (() => {
                        const ward = stats?.wardStats?.find(w => w.ward_id === selectedWard);
                        return (
                          <div className="space-y-2.5 text-xs text-slate-700 font-semibold">
                            <p><strong>Name:</strong> {ward?.ward_name}</p>
                            <p><strong>Total Population:</strong> {ward?.population?.toLocaleString()}</p>
                            <p><strong>Equity Deficit score:</strong> {ward?.equity_score}/10</p>
                            <p><strong>Citizen Requests:</strong> {ward?.citizen_count} entries</p>
                            <p><strong>Active Clusters:</strong> {ward?.cluster_count} nodes</p>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-xs text-slate-500 italic py-4 text-center">Click a ward circle on the map to inspect regional statistics.</p>
                    )}
                  </div>

                  {/* Chart representation */}
                  <div className="border rounded-xl p-4 bg-slate-50">
                    <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider border-b pb-2 mb-3">
                      Constituency Requests Sector Breakdown
                    </h4>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      {stats?.categoryStats?.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.categoryStats}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {stats.categoryStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                              itemStyle={{ color: '#0f172a', fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <span className="text-slate-500 text-xs">No chart data</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECT REGISTRY & WEIGHTS */}
          {activeTab === 'registry' && (
            <div className="space-y-6">
              <div className="border-b pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-blue-900">Project Registry & Prioritization Weights</h3>
                  <p className="text-xs text-slate-500">Tune criteria weights to adjust scores. Wards are sorted by prioritized score.</p>
                </div>
                {/* Preset Selector */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>Preset Settings:</span>
                  <select 
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg text-slate-850 px-2.5 py-1.5 focus:outline-none focus:border-blue-900"
                  >
                    <option value="standard">Standard Balanced</option>
                    <option value="urgency">Urgency / Disaster First</option>
                    <option value="equity">Equity & Underserved First</option>
                    <option value="citizen">Citizen-Led / Engagement</option>
                    <option value="custom" disabled>Custom Settings</option>
                  </select>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border">
                {Object.entries(weights).map(([dim, val]) => (
                  <div key={dim} className="bg-white p-3 rounded-lg border space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="uppercase tracking-wider">{dim}</span>
                      <span className="text-blue-900">{val}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={val}
                      onChange={(e) => handleWeightSlider(dim, e.target.value)}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                    />
                  </div>
                ))}
              </div>

              {/* Registry Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Filter className="h-4 w-4" />
                  <span>Filters:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* CSV Export Button */}
                  <button
                    onClick={exportToCSV}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    title="Export Registry to Excel CSV"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Export CSV
                  </button>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg text-xs text-slate-700 px-3 py-2 font-bold focus:outline-none"
                  >
                    <option value="all">All Sectors</option>
                    <option value="education">Education</option>
                    <option value="roads">Roads</option>
                    <option value="water">Water</option>
                    <option value="health">Health</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="skill">Skill Center</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg text-xs text-slate-700 px-3 py-2 font-bold focus:outline-none"
                  >
                    <option value="all">All States</option>
                    <option value="Proposed">Proposed</option>
                    <option value="Approved">Approved</option>
                    <option value="Tendering">Tendering</option>
                    <option value="Construction">Construction</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="p-3 text-[10px] text-center w-12">Rank</th>
                      <th className="p-3 text-[10px]">Project Details</th>
                      <th className="p-3 text-[10px]">Location</th>
                      <th className="p-3 text-[10px]">Estimated Cost</th>
                      <th className="p-3 text-[10px] text-center">Score</th>
                      <th className="p-3 text-[10px] text-center">Scenario State</th>
                      <th className="p-3 text-[10px] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-500 animate-pulse">
                          Recalculating scored project parameters...
                        </td>
                      </tr>
                    ) : filteredProjectsList.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-500">
                          No projects match selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredProjectsList.map((project, rankIdx) => {
                        const isSelectedInPortfolio = portfolio.selected.some(p => p.id === project.id);
                        const design = CATEGORY_COLORS[project.category] || CATEGORY_COLORS.roads;

                        return (
                          <tr 
                            key={project.id}
                            className={`hover:bg-slate-50 transition ${
                              isSelectedInPortfolio ? 'bg-emerald-50/15' : 'bg-white'
                            }`}
                          >
                            <td className="p-3 text-center font-bold text-slate-900 border-r">
                              #{rankIdx + 1}
                            </td>
                            <td className="p-3 space-y-1.5 max-w-[200px]">
                              <p className="font-extrabold text-slate-950 text-xs">{project.title}</p>
                              <span className={`${design.bg} ${design.text} ${design.border} border px-2 py-0.5 rounded text-[9px] font-bold uppercase`}>
                                {project.category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700">
                              {project.ward_name}
                            </td>
                            <td className="p-3 text-slate-950 font-bold">
                              ₹{project.estimated_cost.toLocaleString('en-IN')}
                            </td>
                            <td className="p-3 text-center text-slate-950 font-extrabold text-sm">
                              {project.total_score}
                            </td>
                            <td className="p-3 text-center">
                              {isSelectedInPortfolio ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase">
                                  Funded
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 border border-slate-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                  Deferred
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setActiveExplainProject(project)}
                                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
                                >
                                  <Award className="h-3 w-3 text-blue-900" />
                                  Explain
                                </button>

                                {project.status === 'Proposed' && (
                                  <button
                                    onClick={() => handleApproveProject(project.id, project.status)}
                                    className="bg-[#f97316] hover:bg-[#e06317] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold shadow-sm transition"
                                  >
                                    Approve
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BUDGET SCENARIOS OPTIMIZER */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              <div className="border-b pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-blue-900">Multi-Objective Budget Scenarios Optimizer</h3>
                  <p className="text-xs text-slate-500">Run knapsack allocation models. Set budget limits and compare planning philosophies.</p>
                </div>
                
                {/* Budget Limit Config */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-700 font-bold">Constituency Budget Cap:</span>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg">
                    <span className="text-slate-500 font-bold">₹</span>
                    <input 
                      type="number"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(parseInt(e.target.value) || 0)}
                      step="50000"
                      className="bg-transparent text-sm text-slate-950 font-black w-24 focus:outline-none"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="200000"
                    max="2500000"
                    step="50000"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(parseInt(e.target.value, 10))}
                    className="h-1 w-24 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-900"
                  />
                </div>
              </div>

              {/* Scenarios Selection Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl border gap-1 overflow-x-auto">
                <button
                  onClick={() => setScenario('max_benefit')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-black whitespace-nowrap transition ${scenario === 'max_benefit' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Max Score (Balanced Portfolio)
                </button>
                <button
                  onClick={() => setScenario('max_citizens')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-black whitespace-nowrap transition ${scenario === 'max_citizens' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Max Citizens Benefited
                </button>
                <button
                  onClick={() => setScenario('max_equity')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-black whitespace-nowrap transition ${scenario === 'max_equity' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Max Equity Deficit Wards
                </button>
                <button
                  onClick={() => setScenario('max_urgency')}
                  className={`px-5 py-2.5 rounded-lg text-xs font-black whitespace-nowrap transition ${scenario === 'max_urgency' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Max Urgency First
                </button>
              </div>

              {/* Scenario Allocation Overview */}
              <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border text-center text-xs font-bold">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Allocated Cost</span>
                  <span className="text-base font-black text-slate-900">₹{portfolio.totalSpent.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-y py-2 min-[480px]:border-y-0 min-[480px]:border-x min-[480px]:py-0 border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Remaining Balance</span>
                  <span className="text-base font-black text-blue-900">₹{portfolio.remainingBudget.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Project Distribution</span>
                  <span className="text-base font-black text-emerald-800 font-extrabold">
                    {portfolio.selected?.length || 0} Funded / {portfolio.deferred?.length || 0} Deferred
                  </span>
                </div>
              </div>

              {/* Side-by-Side Allocation lists */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Funded Column */}
                <div className="border border-emerald-300 rounded-xl p-4 bg-emerald-50/5 space-y-3">
                  <div className="border-b border-emerald-200 pb-2 flex items-center justify-between">
                    <h4 className="font-extrabold text-emerald-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      Funded Portfolio ({portfolio.selected?.length || 0})
                    </h4>
                    <div className="flex items-center gap-3">
                      {portfolio.selected?.length > 0 && (
                        <button
                          onClick={handlePrintSanctionOrder}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded shadow-sm transition flex items-center gap-1.5"
                        >
                          <Printer className="h-3.5 w-3.5" /> Print Order
                        </button>
                      )}
                      <span className="text-xs font-bold text-emerald-800">
                        Total: ₹{portfolio.totalSpent.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {portfolio.selected?.length === 0 ? (
                      <p className="text-slate-500 text-xs italic py-8 text-center">No projects allocated within this budget cap.</p>
                    ) : (
                      portfolio.selected.map(proj => (
                        <div key={proj.id} className="bg-white p-3 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-extrabold text-slate-900">{proj.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Ward {proj.ward_id} • {proj.category.toUpperCase()}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="font-extrabold text-slate-900">₹{proj.estimated_cost.toLocaleString('en-IN')}</p>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Score: {proj.total_score}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Deferred Column */}
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/20 space-y-3">
                  <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-600 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Deferred / Queue ({portfolio.deferred?.length || 0})
                    </h4>
                    <span className="text-xs font-bold text-slate-600">
                      Total: ₹{portfolio.deferred?.reduce((sum, p) => sum + p.estimated_cost, 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {portfolio.deferred?.length === 0 ? (
                      <p className="text-slate-500 text-xs italic py-8 text-center">All projects funded in this scenario!</p>
                    ) : (
                      portfolio.deferred.map(proj => (
                        <div key={proj.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-extrabold text-slate-900">{proj.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Ward {proj.ward_id} • {proj.category.toUpperCase()}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="font-extrabold text-slate-900">₹{proj.estimated_cost.toLocaleString('en-IN')}</p>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Score: {proj.total_score}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: AUDIT QUEUE AND LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div className="border-b pb-3">
                <h3 className="text-base font-black text-blue-900">AI Ingestion Audit Workspace</h3>
                <p className="text-xs text-slate-500">Review pipeline categorization warnings and check decision logs for transparency audits.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Verification Queue List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      Pending Verification Queue
                    </h4>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {verificationQueue.length} alerts
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {verificationQueue.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        <CheckCircle className="h-8 w-8 text-emerald-500/20 mx-auto mb-2" />
                        No pending low confidence ingestion warnings.
                      </div>
                    ) : (
                      verificationQueue.map(item => (
                        <div 
                          key={item.id}
                          className="bg-slate-50 p-4 rounded-xl border space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              Confidence: {Math.round(item.confidence_score * 100)}%
                            </span>
                            <span className="text-slate-600 font-bold">Ward {item.ward_id || 'Pool'}</span>
                          </div>
                          <p className="text-slate-800 italic">"{item.issue_details}"</p>
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <span className="text-slate-600 font-bold">Sector: <strong className="text-slate-900 uppercase font-black">{item.category}</strong></span>
                            <button
                              onClick={() => handleVerifyQueueItem(item.id, item.category, item.ward_id, item.issue_details, item.trust_score)}
                              className="ml-auto bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded font-bold transition"
                            >
                              Verify & Save
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit trail decision logs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Traceability Decision Audit Logs
                    </h4>
                  </div>

                  <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                    {stats?.recentDecisions?.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        No decisions logged in this cycle yet.
                      </div>
                    ) : (
                      stats?.recentDecisions?.map(log => (
                        <div key={log.id} className="text-xs bg-slate-50 p-3.5 rounded-lg border flex justify-between gap-4">
                          <div>
                            <p className="text-slate-800 font-bold">
                              <strong>{log.actor}</strong> changed Project #{log.project_id} state to <span className="text-blue-900">{log.new_state}</span>
                            </p>
                            <p className="text-slate-500 mt-1 italic font-semibold">Reason: "{log.reason}"</p>
                          </div>
                          <span className="text-slate-500 text-[10px] font-bold whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <p>© 2026 Constituency Development Portal. National Informatics Centre (NIC) Mock Standard.</p>
      </footer>

      {/* EXPLAINER CARD MODAL (Explainability Breakdown Tree) */}
      {activeExplainProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-350 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest block">Audit Explainability Evidence Card</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{activeExplainProject.title}</h3>
              </div>
              <button
                onClick={() => setActiveExplainProject(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 h-8 w-8 rounded-full flex items-center justify-center font-bold text-lg transition"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[450px] overflow-y-auto">
              
              {/* Evidence attributions */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border">
                <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Contributing Attributions</h4>
                <ul className="space-y-2 text-xs text-slate-700 font-semibold">
                  {activeExplainProject.evidence_reasons?.map((reason, idx) => (
                    <li key={idx} className="flex gap-2 items-start">
                      <ChevronRight className="h-4 w-4 text-[#f97316] shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sub-Score Breakdown visualizer */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Priority Weight Multi-Criteria Tree</h4>
                
                <div className="space-y-2.5">
                  {Object.entries(activeExplainProject.sub_scores).map(([dim, score]) => {
                    const weightVal = weights[dim] || 0;
                    const contribution = ((score * weightVal) / 10).toFixed(1);

                    return (
                      <div key={dim} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="uppercase tracking-wider">{dim} indicator</span>
                          <span>
                            {score.toFixed(1)}/10 &times; {weightVal}% = <strong className="text-blue-950">+{contribution}</strong>
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border">
                          <div 
                            className="bg-blue-900 h-full rounded-full"
                            style={{ width: `${score * 10}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Score summing calculation note */}
                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-center">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">NIC Priority Calculation Formula</span>
                  <span className="text-base font-black text-slate-900">
                    Total Weighted Score = <span className="text-blue-900">{activeExplainProject.total_score}/100</span>
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveExplainProject(null)}
                className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Close Audit Card
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
