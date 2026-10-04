"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { upsertProfile, uploadImage } from "@/lib/supabase";

function ProfileEditor({ user, initialProfile = {}, setAuthProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [avatarMsg, setAvatarMsg] = useState("");
  const fileInputRef = useRef(null);
  const saveMsgTimerRef = useRef(null);
  const avatarMsgTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (saveMsgTimerRef.current) window.clearTimeout(saveMsgTimerRef.current);
      if (avatarMsgTimerRef.current)
        window.clearTimeout(avatarMsgTimerRef.current);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const flashSaveMessage = (message) => {
    if (saveMsgTimerRef.current) window.clearTimeout(saveMsgTimerRef.current);
    setSaveMsg(message);
    saveMsgTimerRef.current = window.setTimeout(() => setSaveMsg(""), 2000);
  };

  const flashAvatarMessage = (message) => {
    if (avatarMsgTimerRef.current)
      window.clearTimeout(avatarMsgTimerRef.current);
    setAvatarMsg(message);
    avatarMsgTimerRef.current = window.setTimeout(() => setAvatarMsg(""), 2000);
  };

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const payload = {
        id: user.id,
        full_name: profile.full_name || null,
        phone: profile.phone || null,
        avatar_url: profile.avatar_url || null,
      };
      const savedProfile = await upsertProfile(payload);
      const nextProfile = savedProfile || payload;
      setProfile(nextProfile);
      setAuthProfile?.(nextProfile);
      flashSaveMessage("Saved");
    } catch (err) {
      console.error(err);
      flashSaveMessage("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
    setAvatarMsg("");
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;
    setSavingAvatar(true);
    setAvatarMsg("");
    try {
      // NOTE: verify "products" is really the intended storage bucket for
      // user avatars, not left over from product-image upload code.
      const publicUrl = await uploadImage(avatarFile, "products");
      const payload = {
        id: user.id,
        full_name: profile?.full_name || null,
        phone: profile?.phone || null,
        avatar_url: publicUrl,
      };
      const savedProfile = await upsertProfile(payload);
      const nextProfile = savedProfile || payload;
      setProfile(nextProfile);
      setAuthProfile?.(nextProfile);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      flashAvatarMessage("Uploaded");
    } catch (err) {
      console.error("Avatar upload failed", err);
      flashAvatarMessage("Upload failed");
    } finally {
      setSavingAvatar(false);
    }
  };

  return (
    <main className="pt-[120px] min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="font-display font-extrabold text-2xl mb-4">Account</h1>
        <div className="bg-muted p-6 rounded-lg">
          <div className="mb-4 flex items-center gap-4">
            <div>
              {profile?.avatar_url || avatarPreview ? (
                <img
                  src={avatarPreview || profile?.avatar_url}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-ink">
                  {(profile?.full_name || user?.email || "U")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-sub mb-1">
                Change avatar
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="text-sm"
                />
                <button
                  onClick={uploadAvatar}
                  disabled={!avatarFile || savingAvatar}
                  className="btn-outline text-sm"
                >
                  {savingAvatar ? "Uploading..." : avatarMsg || "Upload"}
                </button>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-sub mb-1">Name</label>
            <input
              value={profile?.full_name || ""}
              onChange={(e) => {
                setProfile((current) => ({
                  ...(current || {}),
                  full_name: e.target.value,
                }));
                setSaveMsg("");
              }}
              className="w-full p-2 border border-border rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-sub mb-1">Email</label>
            <input
              value={user?.email || ""}
              readOnly
              className="w-full p-2 border border-border rounded bg-white/60"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-sub mb-1">Phone</label>
            <input
              value={profile?.phone || ""}
              onChange={(e) => {
                setProfile((current) => ({
                  ...(current || {}),
                  phone: e.target.value,
                }));
                setSaveMsg("");
              }}
              className="w-full p-2 border border-border rounded"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : saveMsg || "Save profile"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  const auth = useAuth();
  const {
    user,
    loading: authLoading,
    profile: authProfile,
    setProfile: setAuthProfile,
  } = auth ?? {};

  if (authLoading) {
    return (
      <div className="pt-[120px] min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <main className="pt-[120px] min-h-screen bg-white">
        <div className="max-w-3xl mx-auto p-6">
          <h1 className="font-display font-extrabold text-2xl mb-4">Account</h1>
          <div className="bg-muted p-6 rounded-lg">
            <p className="text-sub mb-4">
              Please sign in to view and edit your account.
            </p>
            <Link href="/login" className="btn-primary">
              Go to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ProfileEditor
      key={`${user.id}-${authProfile?.id || "nouser"}`}
      user={user}
      initialProfile={authProfile || {}}
      setAuthProfile={setAuthProfile}
    />
  );
}