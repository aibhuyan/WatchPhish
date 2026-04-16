import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { ShieldAlert, X, CheckCircle2, Target, Lightbulb, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface HotspotDef {
  id: string;
  label: string;
  explanation: string;
}

interface SimScenario {
  title: string;
  subtitle: string;
  mockup: (props: MockupProps) => React.ReactNode;
  hotspots: HotspotDef[];
  tip: string;
}

interface MockupProps {
  onHotspotClick: (id: string) => void;
  found: Set<string>;
  showHint: string | null;
}

function HotspotZone({ id, children, onHotspotClick, found, showHint, className = "" }: {
  id: string;
  children: React.ReactNode;
  onHotspotClick: (id: string) => void;
  found: Set<string>;
  showHint: string | null;
  className?: string;
}) {
  const isFound = found.has(id);
  const isHinted = showHint === id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onHotspotClick(id); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onHotspotClick(id); } }}
      className={`relative cursor-pointer text-left transition-all duration-300 rounded-md ${
        isFound
          ? "ring-2 ring-red-500/60 bg-red-500/10 cursor-default"
          : isHinted
          ? "ring-2 ring-yellow-400/80 bg-yellow-400/15 animate-pulse"
          : "hover:ring-2 hover:ring-primary/40 hover:bg-primary/5"
      } ${className}`}
    >
      {children}
      {isFound && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-10"
        >
          <CheckCircle2 className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </div>
  );
}

function MicrosoftMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-white text-black min-h-[420px] flex flex-col">
      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 text-xs text-gray-500 border-b border-gray-200">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex items-center">
          <HotspotZone id="https" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="inline-flex items-center px-1 py-0.5 rounded">
            <span className="text-green-600 mr-1">🔒</span>
          </HotspotZone>
          <HotspotZone id="url" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-[11px] font-mono">
            <span className="text-gray-400">https://</span>
            <span className="text-gray-800 font-semibold">login.microsoftt-secure.com</span>
            <span className="text-gray-400">/auth/signin</span>
          </HotspotZone>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[340px]">
          <div className="mb-6">
            <svg viewBox="0 0 108 24" className="h-5" xmlns="http://www.w3.org/2000/svg">
              <rect width="10" height="10" fill="#f25022" x="1" y="1"/>
              <rect width="10" height="10" fill="#7fba00" x="13" y="1"/>
              <rect width="10" height="10" fill="#00a4ef" x="1" y="13"/>
              <rect width="10" height="10" fill="#ffb900" x="13" y="13"/>
              <text x="30" y="18" fontSize="14" fontFamily="Segoe UI, sans-serif" fontWeight="600" fill="#333">Microsoft</text>
            </svg>
          </div>
          <h2 className="text-2xl font-light mb-6 text-gray-900">Sign in</h2>
          <HotspotZone id="form" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="w-full mb-1">
            <input disabled className="w-full border-b-2 border-gray-300 py-2.5 text-sm bg-transparent cursor-not-allowed outline-none placeholder:text-gray-500 pointer-events-none" placeholder="Email, phone, or Skype" />
          </HotspotZone>
          <p className="text-xs text-gray-500 mb-6 mt-1">No account? <span className="text-blue-600 cursor-pointer">Create one!</span></p>
          <p className="text-xs text-gray-500 mb-6"><span className="text-blue-600 cursor-pointer">Can't access your account?</span></p>
          <div className="flex justify-end">
            <button disabled className="bg-[#0067b8] text-white px-10 py-2.5 text-sm font-medium cursor-not-allowed rounded-sm">Next</button>
          </div>
          <HotspotZone id="terms" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="mt-8">
            <p className="text-[10px] text-gray-400 leading-relaxed">By continuing, you agree to the Terms of Use and acknowledge our Privacy Statement.</p>
          </HotspotZone>
        </div>
      </div>
    </div>
  );
}

function PayPalMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-gray-50 text-black min-h-[420px] flex flex-col">
      <HotspotZone id="sender" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-700 rounded-full flex items-center justify-center text-white text-[8px] font-bold">PP</span>
          <span className="text-xs text-gray-400">noreply@paypa1-security.com</span>
        </div>
        <span className="text-xs text-gray-400">Today 9:14 AM</span>
      </HotspotZone>
      <div className="flex-1 p-8">
        <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <HotspotZone id="brand" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="bg-[#003087] p-4 text-center w-full">
            <span className="text-white text-xl font-bold italic">PayPaI</span>
          </HotspotZone>
          <div className="p-6 space-y-4">
            <HotspotZone id="greeting" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p className="text-gray-800 font-medium">Dear Customer,</p>
            </HotspotZone>
            <HotspotZone id="urgency" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-800">
                ⚠️ Your account has been limited due to suspicious activity. Immediate action is required.
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                We detected unauthorized access from an unrecognized device. To restore full access, you must verify your identity within <span className="font-bold text-red-600">24 hours</span> or your account will be permanently suspended.
              </p>
            </HotspotZone>
            <HotspotZone id="cta" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="text-center py-3">
              <button disabled className="bg-[#0070ba] text-white px-8 py-3 rounded-full font-bold text-sm cursor-not-allowed w-full pointer-events-none">
                Verify My Account Now →
              </button>
            </HotspotZone>
            <p className="text-[10px] text-gray-400 text-center mt-4">
              PayPal (Europe) S.à r.l. · 22-24 Boulevard Royal · L-2449 Luxembourg<br/>
              Älä vastaa tähän sähköpostiin. ref:PP-492-381-002
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmishingMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full min-h-[420px] flex items-center justify-center bg-gray-900 p-4">
      <div className="w-[300px] bg-black rounded-[2.5rem] border-[6px] border-gray-700 p-2 shadow-2xl">
        <div className="bg-gray-900 rounded-[2rem] overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex justify-between items-center">
            <span className="text-white text-xs font-medium">Messages</span>
            <span className="text-gray-400 text-[10px]">now</span>
          </div>
          <div className="p-3 space-y-3">
            <HotspotZone id="sender" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex items-center gap-2 pb-2 border-b border-gray-800">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">FI</div>
              <div>
                <p className="text-white text-xs font-medium">+358 40 123 4567</p>
                <p className="text-gray-500 text-[10px]">Unknown Sender</p>
              </div>
            </HotspotZone>
            <div className="text-center">
              <span className="text-gray-500 text-[10px] bg-gray-800 px-3 py-0.5 rounded-full">Today 10:42 AM</span>
            </div>
            <HotspotZone id="urgency" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-gray-800 text-white p-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed max-w-[90%]">
                Posti: Your package #FI2948271 could not be delivered due to incomplete address info. Update here to avoid return:
              </div>
            </HotspotZone>
            <HotspotZone id="url" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="ml-0 max-w-[90%]">
              <div className="bg-gray-800 text-blue-400 underline px-3 pb-3 rounded-b-2xl text-[13px]">
                hxxps://posti-redelivery.track-pkg[.]xyz/confirm
              </div>
            </HotspotZone>
            <HotspotZone id="unsub" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-gray-800 text-white p-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed max-w-[90%] mt-1">
                Reply STOP to unsubscribe. Standard msg rates apply.
              </div>
            </HotspotZone>
          </div>
          <div className="p-3 border-t border-gray-800">
            <div className="bg-gray-800 rounded-full px-4 py-2 flex items-center">
              <span className="text-gray-500 text-xs flex-1">iMessage</span>
              <span className="text-blue-500 text-sm">↑</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-gray-50 text-black min-h-[420px] flex flex-col">
      <HotspotZone id="sender" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">From: billing@pr0countor-invoices.com</span>
        </div>
        <span className="text-xs text-gray-400">Today 8:03 AM</span>
      </HotspotZone>
      <div className="flex-1 p-6">
        <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <HotspotZone id="urgency" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900">INVOICE #INV-2024-4821</h3>
                <p className="text-xs text-gray-500 mt-1">Due Date: Immediate payment required</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">3,847.00 €</p>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">OVERDUE</span>
              </div>
            </div>
          </HotspotZone>
          <div className="p-6 space-y-3 text-sm text-gray-600">
            <p>Dear Accounts Payable,</p>
            <p>This is a reminder that invoice #INV-2024-4821 for <b>IT consulting services</b> is past due. To avoid late fees and service interruption, please process payment immediately.</p>
            <HotspotZone id="banking" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800">
                ⚠️ Updated banking details: Please use the new SEPA transfer details below. Our previous account has been closed.
              </div>
            </HotspotZone>
            <HotspotZone id="wire" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                Bank: Nordea Finland<br/>
                IBAN: FI21 1234 5600 0007 85<br/>
                BIC: NDEAFIHH<br/>
                Reference: INV-2024-4821
              </div>
            </HotspotZone>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <button disabled className="bg-green-600 text-white px-6 py-2.5 rounded font-medium text-sm cursor-not-allowed">Pay Now — 3,847.00 €</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-white text-black min-h-[420px] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-4 text-white text-center">
          <h3 className="font-bold text-lg">Wi-Fi Authentication Required</h3>
          <p className="text-blue-100 text-xs mt-1">Corporate Network — Guest Access</p>
        </div>
        <div className="p-6 text-center space-y-4">
          <p className="text-sm text-gray-600">Scan the QR code below to connect to the secure corporate Wi-Fi network.</p>
          <HotspotZone id="qr" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
            <div className="w-40 h-40 bg-gray-900 rounded relative overflow-hidden">
              <div className="absolute inset-2 grid grid-cols-8 grid-rows-8 gap-px">
                {Array.from({length: 64}).map((_, i) => (
                  <div key={i} className={`${[0,1,2,8,9,10,16,17,18,5,6,7,13,14,15,21,22,23,40,41,42,48,49,50,56,57,58].includes(i) ? 'bg-gray-900' : (i % 3 === 0 ? 'bg-gray-900' : 'bg-white')}`} />
                ))}
              </div>
              <div className="absolute top-1 left-1 w-6 h-6 border-[3px] border-white bg-gray-900 rounded-sm" />
              <div className="absolute top-1 right-1 w-6 h-6 border-[3px] border-white bg-gray-900 rounded-sm" />
              <div className="absolute bottom-1 left-1 w-6 h-6 border-[3px] border-white bg-gray-900 rounded-sm" />
            </div>
          </HotspotZone>
          <div className="text-xs text-gray-500 space-y-1">
            <HotspotZone id="url" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p>Or visit: <span className="text-blue-600 underline">hxxps://corp-wifi-auth[.]net/connect</span></p>
            </HotspotZone>
            <HotspotZone id="timer" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p className="text-[10px] text-gray-400">This QR code expires in 15 minutes</p>
            </HotspotZone>
          </div>
          <HotspotZone id="creds" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 text-left">
              📋 After scanning, you'll be asked to sign in with your corporate credentials to complete the connection.
            </div>
          </HotspotZone>
        </div>
      </div>
    </div>
  );
}

function AiSpearMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-gray-50 text-black min-h-[420px] flex flex-col">
      <HotspotZone id="sender" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JK</div>
          <div>
            <p className="text-xs font-medium text-gray-800">Janne Korhonen — VP Engineering</p>
            <p className="text-[10px] text-gray-400">j.korhonen@yritys-corp.io</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">Today 3:47 PM</span>
      </HotspotZone>
      <div className="flex-1 p-6">
        <div className="max-w-lg mx-auto space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Re: Q4 Performance Review — Action Required</h3>
          <div className="text-sm text-gray-700 leading-relaxed space-y-3">
            <p>Hi Anna,</p>
            <HotspotZone id="context" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p>Hope you had a great weekend! Wanted to follow up on our Friday standup discussion about the Q4 performance reviews.</p>
            </HotspotZone>
            <HotspotZone id="urgency" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p>I've prepared the updated salary review document we discussed. Since the board meeting is next Tuesday, I need your sign-off on the compensation adjustments by end of day today.</p>
            </HotspotZone>
            <p>Here's the document — log in with your corporate credentials:</p>
            <HotspotZone id="link" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-white text-lg">📄</div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Q4_Salary_Review_2024.xlsx</p>
                  <p className="text-[10px] text-gray-500">hxxps://docs-secure[.]yritys-corp.io/shared/review</p>
                </div>
              </div>
            </HotspotZone>
            <HotspotZone id="secrecy" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p>And please keep this confidential for now — we don't want the figures leaking before the official announcement.</p>
            </HotspotZone>
            <p>Thanks,<br/><b>Janne</b></p>
          </div>
          <div className="text-[10px] text-gray-400 border-t border-gray-200 pt-3">
            Sent from my iPhone
          </div>
        </div>
      </div>
    </div>
  );
}

function BitbMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-white text-black min-h-[420px] flex flex-col">
      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 text-xs text-gray-500 border-b border-gray-200">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <HotspotZone id="url-outer" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-[11px] font-mono">
          <span className="text-green-600 mr-1">🔒</span>
          <span className="text-gray-400">https://</span>
          <span className="text-gray-800">legitimate-site.com/login</span>
        </HotspotZone>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-800/30">
        <div className="w-full max-w-[380px] bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-300">
          <div className="bg-gray-200 flex items-center gap-2 text-[10px]">
            <HotspotZone id="controls" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex gap-1 px-3 py-2.5 self-stretch items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </HotspotZone>
            <HotspotZone id="url-inner" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 font-mono text-[9px] mr-3 my-1.5">
              <span className="text-green-600 mr-0.5">🔒</span>
              <span className="text-gray-800">accounts.google.com/signin</span>
            </HotspotZone>
          </div>
          <HotspotZone id="popup" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center gap-0.5 mb-2">
                <span className="text-[#4285F4] text-2xl font-bold">G</span>
                <span className="text-[#EA4335] text-2xl font-bold">o</span>
                <span className="text-[#FBBC05] text-2xl font-bold">o</span>
                <span className="text-[#4285F4] text-2xl font-bold">g</span>
                <span className="text-[#34A853] text-2xl font-bold">l</span>
                <span className="text-[#EA4335] text-2xl font-bold">e</span>
              </div>
              <p className="text-base font-normal text-gray-800">Sign in</p>
              <p className="text-xs text-gray-500 mt-1">Use your Google Account</p>
            </div>
            <input disabled className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm mb-4 cursor-not-allowed pointer-events-none" placeholder="Email or phone" />
            <p className="text-xs text-blue-600 mb-4 cursor-pointer">Forgot email?</p>
            <p className="text-[11px] text-gray-500 mb-6">Not your computer? Use Guest mode to sign in privately. <span className="text-blue-600 cursor-pointer">Learn more</span></p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600 cursor-pointer">Create account</span>
              <button disabled className="bg-[#1a73e8] text-white px-6 py-2 text-sm rounded cursor-not-allowed pointer-events-none">Next</button>
            </div>
          </HotspotZone>
        </div>
      </div>
    </div>
  );
}

function AitmMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-gray-50 text-black min-h-[420px] flex flex-col">
      <HotspotZone id="sender" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">From: security@company-365auth.com</span>
        </div>
        <span className="text-xs text-gray-400">Today 2:15 PM</span>
      </HotspotZone>
      <div className="flex-1 p-6">
        <div className="max-w-lg mx-auto bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0078d4] p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <span className="text-white text-sm">🔒</span>
            </div>
            <div className="text-white">
              <p className="text-sm font-semibold">Security Alert — Multi-Factor Required</p>
              <p className="text-[10px] text-blue-100">Microsoft 365 Security Center</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <HotspotZone id="fear" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                🚨 We detected a sign-in from an unrecognized location (Lagos, Nigeria). If this wasn't you, please verify your identity immediately.
              </div>
            </HotspotZone>
            <HotspotZone id="mfa" onHotspotClick={onHotspotClick} found={found} showHint={showHint}>
              <p className="text-sm text-gray-600">
                To secure your account, you need to complete additional verification. Click the button below — you'll be redirected to the Microsoft 365 login page where you'll need to enter your password and approve the MFA prompt.
              </p>
            </HotspotZone>
            <HotspotZone id="button" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="text-center py-2">
              <button disabled className="bg-[#0078d4] text-white px-8 py-3 rounded font-medium text-sm cursor-not-allowed w-full pointer-events-none">
                Verify My Identity →
              </button>
            </HotspotZone>
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-[10px] text-gray-500 space-y-1">
              <p><b>Sign-in details:</b></p>
              <p>Location: Lagos, Nigeria</p>
              <p>IP: 41.190.23.xxx</p>
              <p>Browser: Chrome 119 on Windows</p>
              <p>Time: {new Date().toLocaleDateString()} 2:13 PM UTC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CeoFraudMockup({ onHotspotClick, found, showHint }: MockupProps) {
  return (
    <div className="w-full bg-gray-100 text-black min-h-[420px] flex flex-col">
      <HotspotZone id="channel" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">MV</div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Mikko Virtanen (CEO)</p>
          <p className="text-[10px] text-green-200">online</p>
        </div>
        <span className="text-xs text-green-200">WhatsApp</span>
      </HotspotZone>
      <div className="flex-1 p-4 space-y-3 bg-[#ece5dd]">
        <HotspotZone id="linkedin" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex justify-end mb-1">
          <span className="text-[9px] text-gray-500 mr-2 mt-auto">14:41</span>
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
            <p className="text-sm">Hey — saw your LinkedIn update, welcome to the team! 🎉</p>
          </div>
        </HotspotZone>
        <div className="flex justify-end mb-1">
          <span className="text-[9px] text-gray-500 mr-2 mt-auto">14:42</span>
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
            <p className="text-sm">I need a small favor before your onboarding wraps up. I'm stuck in a board meeting and can't step out.</p>
          </div>
        </div>
        <HotspotZone id="giftcard" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex justify-end mb-1">
          <span className="text-[9px] text-gray-500 mr-2 mt-auto">14:42</span>
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
            <p className="text-sm">Could you pick up 4x €200 S-Group gift cards from the nearest Prisma? They're for a client appreciation event this afternoon. I'll reimburse you right away — just send me photos of the card backs.</p>
          </div>
        </HotspotZone>
        <HotspotZone id="secrecy" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex justify-end mb-1">
          <span className="text-[9px] text-gray-500 mr-2 mt-auto">14:43</span>
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
            <p className="text-sm">Keep this between us — it's a surprise for the clients. Don't mention it to anyone at the office yet. 🤫</p>
          </div>
        </HotspotZone>
        <HotspotZone id="urgency" onHotspotClick={onHotspotClick} found={found} showHint={showHint} className="flex justify-end mb-1">
          <span className="text-[9px] text-gray-500 mr-2 mt-auto">14:43</span>
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
            <p className="text-sm">Can you handle this within the next 30 mins? Meeting ends at 15:15.</p>
          </div>
        </HotspotZone>
      </div>
      <div className="bg-white px-4 py-3 flex items-center gap-2 border-t border-gray-200">
        <input disabled className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm cursor-not-allowed" placeholder="Type a message..." />
        <div className="w-8 h-8 bg-[#075e54] rounded-full flex items-center justify-center">
          <span className="text-white text-xs">▶</span>
        </div>
      </div>
    </div>
  );
}

function getScenario(attackType: string): SimScenario {
  if (attackType.includes("Credential") && !attackType.includes("Adversary") && !attackType.includes("Browser")) {
    return {
      title: "Credential Harvest",
      subtitle: "Fake Microsoft Login Page",
      mockup: (props) => <MicrosoftMockup {...props} />,
      tip: "Always check the URL carefully — legitimate Microsoft sign-ins only come from microsoft.com or live.com domains.",
      hotspots: [
        { id: "url", label: "Suspicious URL", explanation: "The URL shows 'microsoftt-secure.com' — note the double 't' and non-Microsoft domain. Real Microsoft login only uses 'login.microsoftonline.com' or 'login.live.com'." },
        { id: "form", label: "No password manager autofill", explanation: "Your password manager doesn't recognize this site and won't autofill — a strong signal that the domain doesn't match your saved credentials." },
        { id: "terms", label: "Vague legal text", explanation: "The terms text is generic and doesn't link to real Microsoft privacy policies. Legitimate pages have specific, clickable legal links." },
        { id: "https", label: "HTTPS doesn't mean safe", explanation: "The padlock icon (🔒) only means the connection is encrypted — it does NOT verify the site is legitimate. Phishing sites routinely use HTTPS." },
      ]
    };
  }

  if (attackType.includes("Impersonation")) {
    return {
      title: "Brand Impersonation",
      subtitle: "Fake PayPal Security Alert Email",
      mockup: (props) => <PayPalMockup {...props} />,
      tip: "Real PayPal emails always address you by your full name and never ask you to click links to 'verify' your account.",
      hotspots: [
        { id: "sender", label: "Spoofed sender", explanation: "The sender address is 'noreply@paypa1-security.com' — the 'l' in PayPal is actually a number '1', and 'paypal-security.com' is not a real PayPal domain." },
        { id: "greeting", label: "Generic greeting", explanation: "'Dear Customer' — PayPal always uses your real name. A generic greeting is a red flag that this is a mass phishing email." },
        { id: "urgency", label: "Fear & urgency tactics", explanation: "Phrases like 'suspended', '24 hours', and 'immediate action required' are psychological pressure tactics designed to make you act without thinking." },
        { id: "brand", label: "Misspelled brand name", explanation: "Look closely — it says 'PayPaI' (with a capital I) not 'PayPal' (with a lowercase L). A subtle but critical difference." },
        { id: "cta", label: "Dangerous call-to-action", explanation: "Hovering over this button would reveal a link to a phishing domain, not paypal.com. Never click buttons in suspicious emails — go to PayPal directly." },
      ]
    };
  }

  if (attackType.includes("Smishing") || attackType.includes("SMS")) {
    return {
      title: "SMS Phishing (Smishing)",
      subtitle: "Fake Posti Delivery Text Message",
      mockup: (props) => <SmishingMockup {...props} />,
      tip: "Posti never sends unsolicited texts with links. Always track packages through posti.fi or the Posti app directly.",
      hotspots: [
        { id: "sender", label: "Unknown phone number", explanation: "The message comes from a random Finnish mobile number (+358 40...), not Posti's official sender ID. Real Posti notifications come from 'Posti' as the sender name, not a random number." },
        { id: "url", label: "Suspicious URL", explanation: "The link uses 'posti-redelivery.track-pkg.xyz' — not posti.fi. The subdomain tricks you into thinking it's Posti, but the actual domain is 'track-pkg.xyz'." },
        { id: "urgency", label: "Unsolicited delivery notice", explanation: "You didn't request any delivery updates. Unsolicited package notifications are a common smishing tactic in Finland. Real Posti only texts if you've opted in via OmaPosti." },
        { id: "unsub", label: "Fake unsubscribe line", explanation: "'Reply STOP' adds legitimacy but is fake. Replying confirms your number is active, making you a target for more scams." },
      ]
    };
  }

  if (attackType.includes("Invoice")) {
    return {
      title: "Invoice Fraud",
      subtitle: "Fake Overdue Invoice with Changed Banking Details",
      mockup: (props) => <InvoiceMockup {...props} />,
      tip: "Always verify payment changes through a known phone number — never trust banking details sent via email.",
      hotspots: [
        { id: "sender", label: "Spoofed sender", explanation: "'pr0countor-invoices.com' uses a '0' instead of 'o' and isn't a real Procountor domain. The real domain is procountor.com. This is a common typosquatting technique." },
        { id: "urgency", label: "Fake urgency with amounts", explanation: "A large euro amount (€3,847) and 'OVERDUE' status create pressure to pay quickly without verifying. Attackers count on bypassing your normal payment approval process." },
        { id: "banking", label: "Changed banking details", explanation: "The biggest red flag — 'Updated banking details' claiming the old account was closed. This is the core of the attack: redirecting payment to the attacker's IBAN." },
        { id: "wire", label: "IBAN transfer request", explanation: "SEPA transfers are difficult to reverse once processed. Legitimate vendors rarely change IBAN details via email. Always call the vendor at a known number to verify any banking changes." },
      ]
    };
  }

  if (attackType.includes("QR")) {
    return {
      title: "QR Phishing",
      subtitle: "Fake Corporate Wi-Fi Authentication",
      mockup: (props) => <QrMockup {...props} />,
      tip: "Never scan QR codes from untrusted sources. They can redirect you to phishing sites that steal your credentials.",
      hotspots: [
        { id: "qr", label: "Unverifiable QR code", explanation: "You can't tell where a QR code leads just by looking at it. This one redirects to a phishing site that harvests your corporate credentials." },
        { id: "url", label: "Suspicious fallback URL", explanation: "'corp-wifi-auth.net' is not your company's domain. The fallback URL reveals the true phishing destination that the QR code would take you to." },
        { id: "creds", label: "Credential request", explanation: "The note says you'll need to enter 'corporate credentials' — Wi-Fi authentication should use your device certificates or a portal you recognize, not a random QR code." },
        { id: "timer", label: "Artificial time pressure", explanation: "'Expires in 15 minutes' creates urgency to scan without thinking. Legitimate Wi-Fi networks don't use expiring QR codes." },
      ]
    };
  }

  if (attackType.includes("AI") || attackType.includes("Spear")) {
    return {
      title: "AI-Generated Spear Phishing",
      subtitle: "Convincing Internal Email from 'VP Engineering'",
      mockup: (props) => <AiSpearMockup {...props} />,
      tip: "AI-generated phishing is highly personalized. Verify unexpected requests through a separate communication channel.",
      hotspots: [
        { id: "sender", label: "Lookalike email domain", explanation: "'yritys-corp.io' is not your real company domain. AI phishing uses domains that closely resemble the real one to bypass quick visual checks." },
        { id: "context", label: "Weaponized internal context", explanation: "References to 'Friday standup' and 'Q4 performance reviews' show the attacker researched your organization. AI tools can scrape LinkedIn and public data to craft highly targeted, personalized emails." },
        { id: "link", label: "Credential harvesting link", explanation: "The document link goes to 'docs-secure.yritys-corp.io' — a phishing domain mimicking a file share. Real documents would be on your actual company's file sharing platform." },
        { id: "secrecy", label: "Request for secrecy", explanation: "'Please keep this confidential' isolates you from colleagues who might spot the scam. Attackers use secrecy to prevent you from verifying the request with others." },
        { id: "urgency", label: "Artificial deadline", explanation: "'By end of day today' and 'board meeting is next Tuesday' create time pressure. Urgency is the #1 tactic used in spear phishing." },
      ]
    };
  }

  if (attackType.includes("Browser")) {
    return {
      title: "Browser-in-the-Browser",
      subtitle: "Fake Google Sign-in Popup Window",
      mockup: (props) => <BitbMockup {...props} />,
      tip: "Real popup windows can be dragged outside the browser. If a 'popup' is trapped inside the page, it's fake.",
      hotspots: [
        { id: "popup", label: "Fake browser popup", explanation: "This entire 'popup window' is actually rendered inside the web page. Real OAuth popups are separate browser windows you can drag, resize, and minimize independently." },
        { id: "url-inner", label: "Fake address bar", explanation: "The inner URL bar showing 'accounts.google.com' is just an image/HTML element — it's not a real browser address bar. You can't click or type in it." },
        { id: "url-outer", label: "Real URL tells the truth", explanation: "The REAL address bar at the top shows 'legitimate-site.com' — that's where you actually are. The fake popup's 'Google' URL is just a visual trick." },
        { id: "controls", label: "Fake window controls", explanation: "The close/minimize/maximize buttons are fake HTML elements. Try to drag the window — in a real BitB attack, the 'popup' can't leave the page boundaries." },
      ]
    };
  }

  if (attackType.includes("CEO") || attackType.includes("BEC")) {
    return {
      title: "CEO Fraud / BEC",
      subtitle: "Gift Card Scam Targeting New Employees",
      mockup: (props) => <CeoFraudMockup {...props} />,
      tip: "Executives will never ask employees to buy gift cards. Always verify unusual requests through official company channels — not via the same message thread.",
      hotspots: [
        { id: "channel", label: "Unusual communication channel", explanation: "The CEO is reaching out via WhatsApp, not the company's official communication platform (email, Slack, Teams). Executives don't typically use personal messaging apps for business requests to new employees." },
        { id: "linkedin", label: "LinkedIn reconnaissance", explanation: "'Saw your LinkedIn update' — attackers monitor LinkedIn for new hire announcements, then immediately target those employees who are eager to impress and unfamiliar with internal processes." },
        { id: "giftcard", label: "Gift card request", explanation: "The #1 red flag: S-Group gift cards are untraceable cash equivalents. No legitimate business process involves buying gift cards from Prisma and sending photos of the backs. Once the codes are shared, the money is gone." },
        { id: "secrecy", label: "Request for secrecy", explanation: "'Keep this between us' and 'don't mention it to anyone' isolates you from colleagues who would immediately recognize this as a scam. Secrecy prevents verification." },
        { id: "urgency", label: "Artificial time pressure", explanation: "'Within the next 30 mins' and 'meeting ends at 15:15' create urgency. The attacker wants you to act before you have time to think, verify, or ask someone. Real business requests never have these artificial deadlines." },
      ]
    };
  }

  if (attackType.includes("Adversary") || attackType.includes("Middle") || attackType.includes("AiTM")) {
    return {
      title: "Adversary-in-the-Middle",
      subtitle: "Fake MFA Security Alert",
      mockup: (props) => <AitmMockup {...props} />,
      tip: "AiTM attacks intercept your real login. Never authenticate from email links — always navigate to the service directly.",
      hotspots: [
        { id: "sender", label: "Fake security domain", explanation: "'company-365auth.com' mimics Microsoft 365 but is attacker-controlled. The AiTM proxy sits between you and real Microsoft, capturing your credentials AND your MFA token in real-time." },
        { id: "fear", label: "Fear-based trigger", explanation: "The 'sign-in from Lagos, Nigeria' is fabricated to trigger a fear response. Attackers know security alerts bypass rational thinking — you'll rush to 'secure' your account." },
        { id: "mfa", label: "MFA interception warning sign", explanation: "The email asks you to 'enter your password and approve the MFA prompt.' In an AiTM attack, the phishing page proxies your real login to Microsoft, capturing your session token even after MFA succeeds." },
        { id: "button", label: "Phishing proxy link", explanation: "This button leads to a reverse proxy that mirrors the real Microsoft login page. Everything looks identical, but the attacker captures your credentials and session cookie in real-time." },
      ]
    };
  }

  return {
    title: attackType,
    subtitle: "Phishing Simulation",
    mockup: (props) => <MicrosoftMockup {...props} />,
    tip: "Always verify unexpected requests through a separate communication channel.",
    hotspots: [
      { id: "url", label: "Suspicious URL", explanation: "Always verify the domain in the address bar before entering credentials." },
      { id: "form", label: "Credential request", explanation: "Be cautious about entering credentials on unfamiliar pages." },
    ]
  };
}

interface SimulationModalProps {
  attackType: string | null;
  onClose: () => void;
}

export function SimulationModal({ attackType, onClose }: SimulationModalProps) {
  const [found, setFound] = useState<Set<string>>(new Set());
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const scenario = attackType ? getScenario(attackType) : null;

  const handleHotspotClick = useCallback((id: string) => {
    setFound(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setActiveHotspot(id);
    setShowHint(null);
  }, []);

  const handleHint = useCallback(() => {
    if (!scenario) return;
    setHintUsed(true);
    const remaining = scenario.hotspots.filter(h => !found.has(h.id));
    if (remaining.length > 0) {
      setShowHint(remaining[0].id);
      setTimeout(() => setShowHint(null), 3000);
    }
  }, [scenario, found]);

  const handleReset = useCallback(() => {
    setFound(new Set());
    setActiveHotspot(null);
    setHintUsed(false);
    setShowHint(null);
    setCompleted(false);
  }, []);

  if (!attackType || !scenario) return null;

  const total = scenario.hotspots.length;
  const foundCount = found.size;
  const progress = (foundCount / total) * 100;
  const allFound = foundCount === total;

  const score = allFound ? (hintUsed ? Math.max(60, 100 - 10) : 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="relative w-full max-w-5xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface/50 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Phishing Simulation</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto relative">
            <div className="p-4 border-b border-border bg-surface/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-foreground">{scenario.title}</h3>
                <p className="text-xs text-muted-foreground">{scenario.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Red Flags</p>
                  <p className="text-sm font-bold text-primary">{foundCount} / {total}</p>
                </div>
                <div className="w-20">
                  <Progress value={progress} indicatorClassName="bg-primary" className="h-2 bg-muted" />
                </div>
              </div>
            </div>

            <div className="select-none">
              {scenario.mockup({ onHotspotClick: handleHotspotClick, found, showHint })}
            </div>

            <div className="lg:hidden border-t border-border bg-surface/50">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold">Red Flags Found: {foundCount}/{total}</span>
                </div>
                <div className="flex gap-2">
                  {!allFound && (
                    <Button onClick={handleHint} variant="outline" className="text-xs gap-1.5" size="sm">
                      <Lightbulb className="w-3 h-3" /> Hint
                    </Button>
                  )}
                  {allFound && !completed && (
                    <Button onClick={() => setCompleted(true)} className="text-xs gap-1.5" size="sm">
                      <Trophy className="w-3 h-3" /> Results
                    </Button>
                  )}
                </div>
              </div>

              {foundCount > 0 && (
                <div className="px-3 pb-3 space-y-2">
                  {scenario.hotspots.map((hotspot, idx) => {
                    const isFound = found.has(hotspot.id);
                    if (!isFound) return null;
                    return (
                      <motion.div
                        key={hotspot.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2.5 rounded-lg border bg-red-500/10 border-red-500/30 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="font-medium text-xs text-foreground">{hotspot.label}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5 leading-relaxed">
                          {hotspot.explanation}
                        </p>
                      </motion.div>
                    );
                  })}
                  {!allFound && (
                    <p className="text-[11px] text-muted-foreground text-center py-1">
                      Tap suspicious elements above to find {total - foundCount} more flag{total - foundCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {foundCount === 0 && (
                <p className="text-xs text-muted-foreground text-center px-3 pb-3">
                  Tap suspicious elements in the mockup above to identify red flags
                </p>
              )}
            </div>
          </div>

          <div className="hidden lg:flex lg:w-80 border-l border-border bg-surface/50 flex-col shrink-0">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold">Find the Red Flags</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Click on suspicious elements in the mockup to identify phishing red flags. Find all {total} to complete the simulation.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {scenario.hotspots.map((hotspot, idx) => {
                const isFound = found.has(hotspot.id);
                return (
                  <motion.div
                    key={hotspot.id}
                    initial={false}
                    animate={isFound ? { opacity: 1, y: 0 } : { opacity: 0.5 }}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      isFound
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-muted/30 border-border/50"
                    } ${activeHotspot === hotspot.id ? "ring-2 ring-primary/50" : ""}`}
                    onClick={() => isFound && setActiveHotspot(hotspot.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isFound ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={`font-medium text-xs ${isFound ? "text-foreground" : "text-muted-foreground"}`}>
                        {isFound ? hotspot.label : `Red Flag #${idx + 1}`}
                      </span>
                    </div>
                    {isFound && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-[11px] text-muted-foreground mt-1 pl-5 leading-relaxed"
                      >
                        {hotspot.explanation}
                      </motion.p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <div className="p-3 border-t border-border space-y-2">
              {!allFound && (
                <Button
                  onClick={handleHint}
                  variant="outline"
                  className="w-full text-xs gap-2"
                  size="sm"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Get a Hint
                </Button>
              )}

              <AnimatePresence>
                {allFound && !completed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={() => setCompleted(true)}
                      className="w-full gap-2"
                      size="sm"
                    >
                      <Trophy className="w-3.5 h-3.5" /> View Results
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {completed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card border border-border rounded-xl p-8 max-w-md w-full mx-4 text-center shadow-2xl"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-1">Simulation Complete!</h3>
                <p className="text-muted-foreground mb-6">{scenario.title}</p>

                <div className="flex justify-center gap-8 mb-6">
                  <div>
                    <p className="text-3xl font-bold text-primary">{score}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{foundCount}/{total}</p>
                    <p className="text-xs text-muted-foreground">Flags Found</p>
                  </div>
                </div>

                {hintUsed && (
                  <p className="text-xs text-muted-foreground mb-4">-10% for using hints</p>
                )}

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold mb-1">Key Takeaway</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{scenario.tip}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleReset} variant="outline" className="flex-1 gap-2" size="sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Try Again
                  </Button>
                  <Button onClick={onClose} className="flex-1" size="sm">
                    Done
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
