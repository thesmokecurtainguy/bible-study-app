"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ReminderSettingsData {
  emailRemindersEnabled: boolean;
  reminderTime: string | null;
  reminderTimezone: string | null;
  lastReminderSentAt: Date | null;
}

export function ReminderSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<ReminderSettingsData>({
    emailRemindersEnabled: false,
    reminderTime: null,
    reminderTimezone: "America/New_York",
    lastReminderSentAt: null,
  });

  // Generate time options (every hour from 6 AM to 10 PM)
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    const hourStr = hour.toString().padStart(2, "0");
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const amPm = hour >= 12 ? "PM" : "AM";
    timeOptions.push({
      value: `${hourStr}:00`,
      label: `${displayHour}:00 ${amPm}`,
    });
  }

  const timezoneOptions = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Phoenix", label: "Arizona Time (MST)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
    { value: "UTC", label: "UTC" },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/reminder-settings");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError("Failed to load reminder settings");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/user/reminder-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailRemindersEnabled: settings.emailRemindersEnabled,
          reminderTime: settings.reminderTime || undefined,
          reminderTimezone: settings.reminderTimezone || "America/New_York",
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save settings");
      }

      const data = await response.json();
      setSettings(data);
      setSuccessMessage("Reminder settings saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const formatReminderTime = (time: string | null, timezone: string | null) => {
    if (!time) return "";
    const [hour, minute] = time.split(":");
    const hourNum = parseInt(hour, 10);
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    const amPm = hourNum >= 12 ? "PM" : "AM";
    const tzAbbr = timezoneOptions.find((tz) => tz.value === timezone)?.label || timezone || "ET";
    return `${displayHour}:${minute} ${amPm} ${tzAbbr}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div
          className="rounded-md bg-green-50 p-4 text-sm text-green-800"
          role="alert"
        >
          {successMessage}
        </div>
      )}
      {error && (
        <div
          className="rounded-md bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="reminders-enabled" className="text-base font-medium">
            Enable daily study reminders
          </Label>
          <p className="text-sm text-gray-500">
            Receive email reminders to continue your Bible study journey
          </p>
        </div>
        <Switch
          id="reminders-enabled"
          checked={settings.emailRemindersEnabled}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, emailRemindersEnabled: checked })
          }
        />
      </div>

      {settings.emailRemindersEnabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="reminder-time">Reminder time</Label>
            <Select
              value={settings.reminderTime || ""}
              onValueChange={(value) =>
                setSettings({ ...settings, reminderTime: value })
              }
            >
              <SelectTrigger id="reminder-time" className="w-full">
                <SelectValue placeholder="Select a time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose when you'd like to receive your daily reminder
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-timezone">Timezone</Label>
            <Select
              value={settings.reminderTimezone || "America/New_York"}
              onValueChange={(value) =>
                setSettings({ ...settings, reminderTimezone: value })
              }
            >
              <SelectTrigger id="reminder-timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {settings.reminderTime && settings.reminderTimezone && (
            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">Reminder Status</p>
              <p className="mt-1">
                You'll receive reminders at{" "}
                <strong>{formatReminderTime(settings.reminderTime, settings.reminderTimezone)}</strong>
              </p>
              {settings.lastReminderSentAt && (
                <p className="mt-1 text-xs text-blue-600">
                  Last reminder sent:{" "}
                  {new Date(settings.lastReminderSentAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} isLoading={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

