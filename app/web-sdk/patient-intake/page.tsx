"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Header from "./_components/Header";

interface PatientData {
  patient: {
    firstName: string;
    lastName: string;
  };
  visitInfo: {
    date: string;
    time: string;
    provider: string;
  };
}

export default function PatientIntakeHome() {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_currentTime, setCurrentTime] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("");

  useEffect(() => {
    // Load patient data
    const loadPatientData = async () => {
      setIsLoading(true);
      const response = await fetch("/patient-intake/data/patient-data.json");
      const data = await response.json();
      setPatientData(data);
      setIsLoading(false);
    };

    loadPatientData();

    // Set appointment date and time
    const now = new Date();
    const appointmentDateTime = new Date(now.getTime() + 20 * 60 * 1000); // Add 20 minutes

    setAppointmentDate(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );

    setAppointmentTime(
      appointmentDateTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    );

    // Update current time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "var(--disc-pink)" }}
          ></div>
          <p style={{ color: "var(--foreground)", opacity: 0.7 }}>
            Loading check-in information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <Header />

      {/* Main Check-In Interface */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div
          className="rounded-2xl border p-8 mb-8"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "var(--data-green)", opacity: 0.2 }}
            >
              <svg
                className="w-10 h-10"
                style={{ color: "var(--data-green)" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Patient profile icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2
              className="font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Welcome, {patientData?.patient.firstName}!
            </h2>
            <p
              className="mb-6"
              style={{ color: "var(--foreground)", opacity: 0.85 }}
            >
              Thank you for choosing Springfield Family Medical Center
            </p>
          </div>

          {/* Appointment Details */}
          <div
            className="border rounded-xl p-6 mb-8"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--disc-pink) 10%, var(--background))",
              borderColor:
                "color-mix(in srgb, var(--disc-pink) 30%, var(--neutral))",
            }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3
                  className="font-semibold mb-3 flex items-center"
                  style={{ color: "var(--foreground)" }}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Calendar icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3a4 4 0 118 0v4m-4 5v6M3 10h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Today&apos;s Appointment
                </h3>
                <div
                  className="space-y-1"
                  style={{ color: "var(--foreground)", opacity: 0.9 }}
                >
                  <p>
                    <strong>Date:</strong> {appointmentDate}
                  </p>
                  <p>
                    <strong>Time:</strong> {appointmentTime}
                  </p>
                  <p>
                    <strong>Provider:</strong> {patientData?.visitInfo.provider}
                  </p>
                </div>
              </div>
              <div>
                <h3
                  className="font-semibold mb-3 flex items-center"
                  style={{ color: "var(--foreground)" }}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Document icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Visit Type
                </h3>
                <div style={{ color: "var(--foreground)", opacity: 0.9 }}>
                  <p>Annual Physical Examination</p>
                  <p className="text-sm mt-1" style={{ opacity: 0.8 }}>
                    Comprehensive health check-up
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Check-In Instructions */}
          <div className="mb-8">
            <h3
              className="font-semibold"
              style={{ color: "var(--foreground)", marginBottom: "1.5rem" }}
            >
              Before Your Appointment
            </h3>
            <div
              className="border rounded-lg p-4"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--data-green) 10%, var(--background))",
                borderColor:
                  "color-mix(in srgb, var(--data-green) 30%, var(--neutral))",
              }}
            >
              <div className="flex items-start">
                <div
                  className="w-6 h-6 mr-3 mt-0.5"
                  style={{ color: "var(--data-green)" }}
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-label="Lightning icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p
                    className="font-medium mb-2"
                    style={{ color: "var(--foreground)" }}
                  >
                    Good news!
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--foreground)", opacity: 0.9 }}
                  >
                    We&apos;ve pre-filled your intake forms with information
                    from your previous visits. Please review and update any
                    information as needed, then provide your electronic
                    signatures. Your signature will not be stored.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Begin Check-In Button */}
          <div className="text-center">
            <Link
              href="/web-sdk/patient-intake/patient-portal"
              className="btn btn-secondary btn-lg inline-flex items-center"
            >
              <svg
                className="w-6 h-6 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Begin check-in"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Begin Check-In
            </Link>
          </div>

          <div
            className="mt-6 text-center text-sm"
            style={{ color: "var(--foreground)", opacity: 0.75 }}
          >
            <p>Estimated completion time: 3-5 minutes</p>
          </div>
        </div>

        {/* Help Information */}
        <div
          className="rounded-xl border p-6"
          style={{
            background: "var(--background)",
            borderColor: "var(--neutral)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            className="font-semibold mb-4 flex items-center"
            style={{ color: "var(--foreground)" }}
          >
            <svg
              className="w-5 h-5 mr-2"
              style={{ color: "var(--disc-pink)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Help icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Need Assistance?
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p
                className="font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Technical Support
              </p>
              <p style={{ color: "var(--foreground)", opacity: 0.85 }}>
                If you experience any issues with this tablet, please bring it
                to our front desk staff.
              </p>
            </div>
            <div>
              <p
                className="font-medium mb-1"
                style={{ color: "var(--foreground)" }}
              >
                Medical Questions
              </p>
              <p style={{ color: "var(--foreground)", opacity: 0.85 }}>
                For questions about your forms or appointment, our staff is
                happy to help.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-6"
        style={{
          background: "var(--background)",
          borderColor: "var(--neutral)",
        }}
      >
        <div
          className="max-w-4xl mx-auto px-6 text-center text-xs"
          style={{ color: "var(--foreground)", opacity: 0.65 }}
        >
          <p>
            Springfield Family Medical Center • Secure Digital Check-In System
          </p>
          <p className="mt-1">
            Your information is protected and HIPAA compliant
          </p>
        </div>
      </footer>
    </div>
  );
}
