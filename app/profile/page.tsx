'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/schema.alias';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

function ProfileEditPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    payment_link: '',
  });
  const [errors, setErrors] = useState<{
    full_name?: string;
    email?: string;
    payment_link?: string;
  }>({});

  const router = useRouter();
  const supabase = createClient();

  // Fetch profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/auth/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        toast.error('Failed to load profile data');
        return;
      }

      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        payment_link: profileData.payment_link || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: {
      full_name?: string;
      email?: string;
      payment_link?: string;
    } = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.payment_link.trim()) {
      newErrors.payment_link = 'Payment link is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.payment_link = 'Please enter a valid payment link';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!profile || !validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          payment_link: formData.payment_link.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (profileError) {
        toast.error('Failed to update profile');
        return;
      }

      if (formData.email !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email.trim(),
        });

        if (emailError) {
          toast.error(
            'Profile updated but email change failed. Please try updating your email again.'
          );
        } else {
          toast.success(
            'A confirmation email has been sent to your new email address.'
          );
        }
      }

      setProfile({
        ...profile,
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        payment_link: formData.payment_link.trim(),
        updated_at: new Date().toISOString(),
      });

      toast('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto pt-8 px-4">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load profile</p>
          <Button onClick={loadProfile} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto pt-8 px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">
              Update your personal information
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              This information will be visible to other members of your
              household.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {formData.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="text-sm font-medium">Profile Picture</p>
                <p className="text-sm text-muted-foreground">
                  Avatar is automatically synced from your Google account
                </p>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Enter your full name"
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                disabled
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter your email"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
              {formData.email !== profile.email && (
                <p className="text-sm text-amber-600">
                  Changing your email will require confirmation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Payment Link</Label>
              <Input
                id="payment_link"
                value={profile.payment_link || 'No payment link'}
                onChange={(e) =>
                  setFormData({ ...formData, payment_link: e.target.value })
                }
                placeholder="Enter your payment link"
                className={errors.payment_link ? 'border-red-500' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.payment_link}</p>
              )}
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Member since</p>
                  <p className="font-medium">
                    {new Date(profile.created_at || '').toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last updated</p>
                  <p className="font-medium">
                    {new Date(profile.updated_at || '').toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProfileEditPage;
