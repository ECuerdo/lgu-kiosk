"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface PrintQueueTicketProps {
  queueNumber: string;
  residentName?: string;
  serviceName: string;
  appointmentDate: string | Date;
  appointmentSlot: string;
  isPriority?: boolean;
  department?: string;
  dateGenerated?: string | Date;
  branding?: any;
  themeColor?: string;
  triggerPrint?: boolean;
  kioskMode?: boolean;
  onPrintCompleted?: () => void;
}

const formatDate = (dateStrOrObj: string | Date | null | undefined): string => {
  if (!dateStrOrObj) return "N/A";
  const date = new Date(dateStrOrObj);
  if (isNaN(date.getTime())) return String(dateStrOrObj);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
};

const formatDateTime = (dateStrOrObj: string | Date | null | undefined): string => {
  if (!dateStrOrObj) return "N/A";
  const date = new Date(dateStrOrObj);
  if (isNaN(date.getTime())) return String(dateStrOrObj);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const h = String(hours).padStart(2, '0');
  
  return `${m}/${d}/${y} ${h}:${minutes}:${seconds} ${ampm}`;
};

export default function PrintQueueTicket({
  queueNumber,
  serviceName,
  appointmentDate,
  appointmentSlot,
  dateGenerated = new Date(),
  branding,
  triggerPrint = false,
  kioskMode = false,
  onPrintCompleted
}: PrintQueueTicketProps) {
  const [mounted, setMounted] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQrLoaded(false);
  }, [queueNumber]);

  useEffect(() => {
    if (mounted && triggerPrint) {
      const printNow = () => {
        window.focus();
        window.print();
        if (onPrintCompleted) onPrintCompleted();
      };

      if (kioskMode) {
        const timer = setTimeout(printNow, qrLoaded ? 150 : 400);
        return () => clearTimeout(timer);
      }

      if (qrLoaded) {
        const timer = setTimeout(printNow, 150);
        return () => clearTimeout(timer);
      }

      // Fallback timeout in case image loading fails or takes too long
      const fallback = setTimeout(printNow, 1500);
      return () => clearTimeout(fallback);
    }
  }, [mounted, triggerPrint, qrLoaded, queueNumber, kioskMode, onPrintCompleted]);

  if (!mounted) return null;

  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: 80mm 125mm; 
            margin: 0; 
          }
          body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important;
          }
          body > * { 
            display: none !important; 
          }
          #queue-ticket-print-portal {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            visibility: visible !important;
            overflow: visible !important;
            padding: 2mm !important;
            background: white !important;
            z-index: 99999 !important;
            color: black !important;
          }
          #queue-ticket-print-portal * {
            visibility: visible !important;
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      <div
        id="queue-ticket-print-portal"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '80mm',
          visibility: 'hidden',
          overflow: 'hidden',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace, Courier, sans-serif',
            lineHeight: 1.18,
            color: 'black',
            background: 'white',
            padding: '9px 7px 7px',
            border: '1.5px solid black',
            borderRadius: '10px',
            textAlign: 'center'
          }}
        >
          {/* Official LGU Logo & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '5px' }}>
            {branding?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo}
                alt="LGU Seal"
                style={{ width: '34px', height: '34px', filter: 'grayscale(1) contrast(1.2)', marginBottom: '4px' }}
              />
            ) : (
              <div style={{ width: '30px', height: '30px', border: '1.5px solid black', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}>
                LGU
              </div>
            )}
            <span style={{ fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '0.45px', textTransform: 'uppercase', color: '#333' }}>
              Republic of the Philippines
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.45px', marginTop: '1px' }}>
              Municipality of Mapandan
            </span>
            <span style={{ fontSize: '7.5px', fontWeight: 'bold', letterSpacing: '0.4px', color: '#555' }}>
              Province of Pangasinan
            </span>
            <span style={{ fontSize: '8.5px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '2px', border: '1px solid black', padding: '1px 4px', borderRadius: '3px' }}>
              EMapandan Queue Portal
            </span>
          </div>

          {/* Dotted Divider */}
          <div style={{ borderTop: '1px dotted black', margin: '5px 0' }}></div>

          {/* Ticket Number Section */}
          <div style={{ padding: '2px 0' }}>
            <span style={{ fontSize: '8.5px', fontWeight: 'bold', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
              Queue Ticket Number
            </span>
            <div style={{ 
              border: '1px dashed black', 
              padding: '6px 3px', 
              borderRadius: '6px',
              display: 'inline-block',
              width: '100%',
              boxSizing: 'border-box',
              background: '#fcfcfc'
            }}>
              <span style={{ 
                fontSize: '21px', 
                fontWeight: '900', 
                letterSpacing: '0.35px',
                fontFamily: 'monospace',
                display: 'block'
              }}>
                {queueNumber}
              </span>
            </div>
          </div>

          {/* Dotted Divider */}
          <div style={{ borderTop: '1px dotted black', margin: '5px 0' }}></div>

          {/* Transaction Details */}
          <div style={{ fontSize: '9.5px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '3px', margin: '1px 0 5px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
              <span style={{ fontWeight: 'normal', color: '#333' }}>Service Type:</span>
              <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '60%' }}>{serviceName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
              <span style={{ fontWeight: 'normal', color: '#333' }}>Date:</span>
              <span style={{ fontWeight: 'bold' }}>{formatDate(appointmentDate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
              <span style={{ fontWeight: 'normal', color: '#333' }}>Schedule:</span>
              <span style={{ fontWeight: 'bold' }}>{appointmentSlot}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1px' }}>
              <span style={{ fontWeight: 'normal', color: '#555' }}>Created On:</span>
              <span style={{ fontWeight: 'bold', color: '#333' }}>{formatDateTime(dateGenerated)}</span>
            </div>
          </div>

          {/* Dotted Divider */}
          <div style={{ borderTop: '1px dotted black', margin: '4px 0 5px 0' }}></div>

          {/* Waiting Instructions */}
          <div style={{ fontSize: '8.5px', lineHeight: 1.22, marginBottom: '6px', background: '#fafafa', padding: '5px', border: '1px solid #eee', borderRadius: '5px' }}>
            <p style={{ margin: '0', fontWeight: 'bold' }}>Please wait for your number to be called.</p>
            <p style={{ margin: '0 0 3px 0', fontStyle: 'italic', color: '#555', fontSize: '7.5px' }}>
              (Mangyaring hintayin na tawagin ang inyong numero.)
            </p>
            <p style={{ margin: '0', fontWeight: 'bold' }}>Please have your physical documents ready.</p>
            <p style={{ margin: '0', fontStyle: 'italic', color: '#555', fontSize: '6.5px' }}>
              (Ihanda ang inyong mga kinakailangang dokumento.)
            </p>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${queueNumber}`}
              alt="QR Code"
              style={{ width: '80px', height: '80px', border: '1px solid black', padding: '2px', borderRadius: '3px' }}
              onLoad={() => setQrLoaded(true)}
            />
            <span style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#777', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Scan QR Code at Counter
            </span>
          </div>

          {/* Dotted Divider */}
          <div style={{ borderTop: '1px dotted black', margin: '5px 0 4px 0' }}></div>

          {/* Footer Slogan */}
          <div style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#333', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Serbisyong Tapat at Totoo
          </div>
          <div style={{ fontSize: '6.5px', color: '#666', marginTop: '1px' }}>
            Mapandan, Pangasinan
          </div>
        </div>
      </div>
    </>
    , document.body);
}
