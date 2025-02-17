'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { api } from '@/lib/trpc/react';
import { Lock, Mail, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function SettingsPage() {
  const {
    data: session,
    status,
    update: updateSession,
  } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin');
    },
  });

  const { theme, toggleTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
  });

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: async data => {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      // Update the session to reflect the changes
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
        },
      });
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      name: formData.name,
      phone: formData.phone,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">Settings</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Profile Information - Left Column */}
        <div className="h-fit rounded-lg bg-card p-6 shadow">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-card-foreground">Profile Information</h2>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              disabled={updateProfile.isLoading}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing || updateProfile.isLoading}
                className="block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={true}
                className="block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing || updateProfile.isLoading}
                className="block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {isEditing && (
              <button
                type="submit"
                disabled={updateProfile.isLoading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateProfile.isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                    <span className="ml-2">Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            )}
          </form>
        </div>

        {/* Right Column - Application Settings and Change Password */}
        <div className="space-y-6">
          {/* Application Settings */}
          <div className="rounded-lg bg-card p-6 shadow">
            <div className="mb-6 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-card-foreground">Application Settings</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={theme === 'dark'}
                    onChange={toggleTheme}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary"></div>
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for updates
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary"></div>
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-lg bg-card p-6 shadow">
            <div className="mb-6 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-card-foreground">Change Password</h2>
            </div>

            <form className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="current-password"
                  className="block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="new-password"
                  className="block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  className="block w-full rounded-md border border-input bg-background px-4 py-2 text-foreground shadow-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
