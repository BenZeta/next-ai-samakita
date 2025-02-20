'use client';

import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { api } from '@/lib/trpc/react';
import { Lock, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';

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
  const { locale, changeLanguage } = useLanguage();
  const t = useTranslations();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

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

  const updatePassword = api.user.updatePassword.useMutation({
    onSuccess: () => {
      toast.success('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordConfirmation(true);
  };

  const confirmPasswordUpdate = () => {
    updatePassword.mutate(passwordData);
    setShowPasswordConfirmation(false);
  };

  return (
    <div className="container mx-auto min-h-[calc(100vh-4rem)] px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
          {t('settings.title')}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Profile Information */}
        <div className="h-fit rounded-lg bg-card p-4 shadow sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground sm:text-lg">
                {t('settings.profile.title')}
              </h2>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
              disabled={updateProfile.isLoading}
            >
              {isEditing ? t('settings.profile.cancelButton') : t('settings.profile.editButton')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                {t('settings.profile.name')}
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing || updateProfile.isLoading}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                {t('settings.profile.email')}
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={true}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings.profile.emailHint')}
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
                {t('settings.profile.phone')}
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing || updateProfile.isLoading}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {isEditing && (
              <button
                type="submit"
                disabled={updateProfile.isLoading}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateProfile.isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent"></div>
                    <span className="ml-2">{t('settings.profile.saving')}</span>
                  </div>
                ) : (
                  t('settings.profile.saveButton')
                )}
              </button>
            )}
          </form>
        </div>

        {/* Right Column - Application Settings and Change Password */}
        <div className="space-y-4 sm:space-y-6">
          {/* Language Settings */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h2 className="text-base font-medium text-foreground sm:text-lg">
              {t('settings.language')}
            </h2>
            <div className="mt-3 sm:mt-4">
              <select
                value={locale}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  changeLanguage(e.target.value)
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="en">{t('settings.languageOptions.en')}</option>
                <option value="id">{t('settings.languageOptions.id')}</option>
              </select>
            </div>
          </div>

          {/* Application Settings */}
          <div className="rounded-lg bg-card p-4 shadow sm:p-6">
            <div className="mb-4 flex items-center gap-2 sm:mb-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground sm:text-lg">
                {t('settings.application.title')}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground sm:text-base">
                    {t('settings.application.darkMode')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                    {t('settings.application.darkModeHint')}
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center self-start sm:self-center">
                  <input
                    type="checkbox"
                    checked={theme === 'dark'}
                    onChange={e => toggleTheme(e.target.checked ? 'dark' : 'light')}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary"></div>
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all peer-checked:left-6"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-lg bg-card p-4 shadow sm:p-6">
            <div className="mb-4 flex items-center gap-2 sm:mb-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground sm:text-lg">
                {t('settings.password.title')}
              </h2>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  {t('settings.password.current')}
                </label>
                <input
                  type="password"
                  id="current-password"
                  value={passwordData.currentPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  {t('settings.password.new')}
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={passwordData.newPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  {t('settings.password.confirm')}
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  value={passwordData.confirmPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={updatePassword.isLoading}
                className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatePassword.isLoading
                  ? t('common.saving')
                  : t('settings.password.updateButton')}
              </button>
            </form>
          </div>

          {/* Password Update Confirmation Modal */}
          {showPasswordConfirmation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                onClick={() => setShowPasswordConfirmation(false)}
              />
              <div className="relative z-50 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center">
                  <div className="mr-4 rounded-full bg-primary/10 p-3">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-card-foreground">
                    {t('settings.password.title')}
                  </h3>
                </div>
                <p className="mb-6 text-muted-foreground">
                  Are you sure you want to update your password? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowPasswordConfirmation(false)}
                    className="rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm ring-1 ring-input hover:bg-accent"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={confirmPasswordUpdate}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
