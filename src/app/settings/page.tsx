"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { User, Mail, Phone, Lock } from "lucide-react";
import { redirect } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/signin");
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement settings update
    toast.success("Settings updated successfully!");
    setIsEditing(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account and application preferences</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <div className="relative mt-1">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing}
                      className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <div className="relative mt-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  {isEditing ? (
                    <div className="space-x-4">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Change Password</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      id="currentPassword"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    Update Password
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
                </div>
                <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <span className="translate-x-0 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                    <span className="opacity-0 duration-100 ease-in absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" />
                    <span className="opacity-100 duration-200 ease-out absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" />
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">SMS Notifications</h3>
                  <p className="text-sm text-gray-500">Receive SMS notifications for urgent matters</p>
                </div>
                <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <span className="translate-x-0 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                    <span className="opacity-0 duration-100 ease-in absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" />
                    <span className="opacity-100 duration-200 ease-out absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Application Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Dark Mode</h3>
                  <p className="text-sm text-gray-500">Enable dark mode for the application</p>
                </div>
                <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                  <span className="translate-x-0 pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out">
                    <span className="opacity-0 duration-100 ease-in absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" />
                    <span className="opacity-100 duration-200 ease-out absolute inset-0 flex h-full w-full items-center justify-center transition-opacity" />
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Language</h3>
                  <p className="text-sm text-gray-500">Select your preferred language</p>
                </div>
                <select className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
