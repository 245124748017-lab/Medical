import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileSearch,
  ShieldCheck,
  Cpu,
  History,
  AlertTriangle,
  Lock,
  ArrowRight,
  Activity,
  CheckCircle2,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import ResponsibleAiBanner from '../components/ResponsibleAiBanner';

export default function LandingPage() {
  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-teal-600" />,
      title: 'AI Extraction',
      description:
        'Advanced Gemini vision models extract lab names, numeric values, units, and source ranges into strict structured JSON.',
    },
    {
      icon: <FileSearch className="w-6 h-6 text-sky-600" />,
      title: 'Structured Records',
      description:
        'Convert fragmented PDFs and images into clinical tables with standardized units and precise status indicators.',
    },
    {
      icon: <History className="w-6 h-6 text-indigo-600" />,
      title: 'Source & Provenance Tracking',
      description:
        'Every single clinical value retains transparent lineage: from Source Document to AI Extracted to Human Verified.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      title: 'Human Verification',
      description:
        'Clinicians review, edit, approve, or reject AI extractions with a tamper-evident audit trail recording all changes.',
    },
    {
      icon: <Activity className="w-6 h-6 text-amber-600" />,
      title: 'Report Comparison',
      description:
        'Longitudinal trend analysis and side-by-side delta calculations with neutral, non-diagnostic clinical phrasing.',
    },
    {
      icon: <Lock className="w-6 h-6 text-teal-700" />,
      title: 'Privacy & Safety',
      description:
        'Strict reference range enforcement directly from source reports — never assumed or hallucinated. Zero auto-diagnoses.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <ResponsibleAiBanner />

      {/* Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">MedLens</span>
            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 font-semibold px-2 py-0.5 rounded-full">
              Clinical Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-teal-700 px-3 py-2 rounded-lg transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 md:py-28 px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>AI-Assisted Clinical Information Intelligence</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight md:leading-tight">
            Transform fragmented medical information into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-sky-600">
              structured patient records.
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            MedLens uses AI to organize medical reports, preserve source information, and make clinical
            records easier to review. Built for clinicians, researchers, and patients.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <span>Launch Demo Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all"
            >
              Explore Capabilities
            </a>
          </div>

          {/* Clinical Assurance strip */}
          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Source Reference Preservation
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Complete Human Audit Trail
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Non-Diagnostic Guardrails
            </span>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="py-16 bg-white border-y border-slate-200 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                Designed for Clinical Rigor & Trust
              </h2>
              <p className="mt-3 text-slate-600 text-sm">
                Every feature in MedLens prioritizes data integrity, explainability, and patient safety above all else.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-300 hover:shadow-card transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-5">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Responsible AI Deep-dive */}
        <section className="py-16 px-6 max-w-4xl mx-auto text-center">
          <div className="p-8 rounded-2xl bg-teal-50 border border-teal-200">
            <AlertTriangle className="w-8 h-8 text-teal-700 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-teal-950">Responsible AI Commitment</h3>
            <p className="mt-2 text-sm text-teal-900/90 leading-relaxed max-w-2xl mx-auto">
              MedLens is an information organization tool. It does not provide medical diagnosis, treatment recommendations, or medication dosage adjustments. AI-generated extractions may contain errors and must always be verified by qualified healthcare personnel.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-center text-xs border-t border-slate-800">
        <p>© 2026 MedLens — AI-Powered Clinical Information Intelligence. All rights reserved.</p>
      </footer>
    </div>
  );
}
