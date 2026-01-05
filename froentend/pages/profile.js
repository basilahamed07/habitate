import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import SiteHeader from "../components/SiteHeader";
import { clearAuthToken, postJson, safeFetchJson } from "../lib/api";
import styles from "../styles/Profile.module.css";

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
const PASSWORD_MESSAGE =
  "Password must be at least 8 characters and include 1 uppercase and 1 special character.";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const data = await safeFetchJson("/users/me", null);
      if (!isMounted) {
        return;
      }
      if (!data) {
        router.push("/login");
        return;
      }
      setProfile(data);
      setName(data.name || "");
      setEmail(data.email || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatarUrl || "");
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setStatus("");
    const payload = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedBio = bio.trim();
    const trimmedAvatar = avatarUrl.trim();
    if (trimmedName) {
      payload.name = trimmedName;
    }
    if (trimmedEmail) {
      payload.email = trimmedEmail;
    }
    if (trimmedBio) {
      payload.bio = trimmedBio;
    }
    if (trimmedAvatar) {
      payload.avatarUrl = trimmedAvatar;
    }
    const result = await postJson("/users/me", payload);
    if (result?.id) {
      setProfile(result);
      setStatus("Saved.");
    } else {
      setStatus("Unable to save changes.");
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (!profile) {
      return;
    }
    setName(profile.name || "");
    setEmail(profile.email || "");
    setBio(profile.bio || "");
    setAvatarUrl(profile.avatarUrl || "");
    setStatus("");
  };

  const handleLogout = async () => {
    await postJson("/auth/logout", {});
    clearAuthToken();
    router.push("/login");
  };

  const handlePasswordChange = async () => {
    const trimmedNew = newPassword.trim();
    if (!trimmedNew || isUpdatingPassword) {
      setPasswordStatus("New password is required.");
      return;
    }
    if (!PASSWORD_RULE.test(trimmedNew)) {
      setPasswordStatus(PASSWORD_MESSAGE);
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordStatus("");
    const payload = {
      newPassword: trimmedNew
    };
    if (currentPassword.trim()) {
      payload.currentPassword = currentPassword.trim();
    }
    const result = await postJson("/users/me/password", payload);
    if (result?.status === "ok") {
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus("Password updated.");
    } else {
      setPasswordStatus("Unable to update password.");
    }
    setIsUpdatingPassword(false);
  };

  const avatarSrc = avatarUrl || "/avatars/user-01.svg";

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStatus("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus("Image is too large (max 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarUrl(result);
        setStatus("Photo ready. Save changes to keep it.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className={`page ${styles.profilePage}`}>
      <Head>
        <title>Habit Tracker | User Panel</title>
        <meta name="description" content="Update your profile and account preferences." />
      </Head>

      <SiteHeader
        title="User Panel"
        subtitle="Update your name, photo, and calm account details."
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.backLink} href="/dashboard">
              Back to Dashboard
            </Link>
            <button className={styles.logoutButton} type="button" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        }
      />

      <section className={styles.profileLayout}>
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <img className={styles.profileAvatar} src={avatarSrc} alt="User profile" />
            <div>
              <h3>Profile Settings</h3>
              <span className={styles.profileTag}>Keep your details up to date.</span>
            </div>
          </div>
          <form className={styles.profileForm}>
            <label className={styles.profileLabel}>
              Name
              <input
                className={styles.profileInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className={styles.profileLabel}>
              Email
              <input
                className={styles.profileInput}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className={styles.profileLabel}>
              Bio
              <textarea
                className={styles.profileTextarea}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>
            <label className={styles.profileLabel}>
              Profile photo
              <input
                className={styles.profileFile}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </label>
            {status ? <span className={styles.profileStatus}>{status}</span> : null}
            <div className={styles.profileActions}>
              <button className={styles.primaryButton} type="button" onClick={handleSave}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button className={styles.secondaryButton} type="button" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className={styles.passwordCard}>
          <div className={styles.passwordHeader}>
            <h3>Change Password</h3>
            {router.query.reset ? (
              <span className={styles.resetBadge}>Reset required</span>
            ) : null}
          </div>
          <div className={styles.passwordForm}>
            <label className={styles.profileLabel}>
              Current password
              <input
                className={styles.profileInput}
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
              />
            </label>
            <label className={styles.profileLabel}>
              New password
              <input
                className={styles.profileInput}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
              />
              <span className={styles.passwordHint}>
                Use at least 8 characters with 1 uppercase and 1 special character.
              </span>
            </label>
            {passwordStatus ? <span className={styles.profileStatus}>{passwordStatus}</span> : null}
            <div className={styles.profileActions}>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handlePasswordChange}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>

        <aside className={styles.quoteCard}>
          <div className={styles.quoteGlow} aria-hidden="true" />
          <h3 className={styles.quoteHeadline}>Quiet Ritual Club.</h3>
          <p className={styles.quoteText}>
            "Small steps, repeated daily, shape a calmer self."
          </p>
          <span className={styles.quoteAuthor}>Habitat Notes</span>
        </aside>
      </section>
    </main>
  );
}

export async function getStaticProps() {
  return {
    props: {}
  };
}
