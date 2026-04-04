"use client";

import { useState } from "react";
import {
  createPerson,
  deletePerson,
  updatePerson,
} from "@/app/actions/personActions";
import Button from "@/components/ui/Button";
import UploadStatus from "@/components/ui/UploadStatus";
import {
  createIdleUploadTaskState,
  uploadAssetWithProgress,
} from "@/lib/clientUpload";
import { getUploadUrl } from "@/lib/uploads";

type EditablePerson = {
  id?: string | null;
  name?: string;
  image?: string;
  bio?: string;
  isDotTeamMember?: boolean;
};

interface PersonEditorProps {
  person: EditablePerson | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function PersonEditor({
  person,
  onSave,
  onCancel,
}: PersonEditorProps) {
  const [formData, setFormData] = useState({
    name: person?.name || "",
    image: getUploadUrl(person?.image) || "",
    bio: person?.bio || "",
    isDotTeamMember: Boolean(person?.isDotTeamMember),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUploadStatus, setImageUploadStatus] = useState(
    createIdleUploadTaskState,
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadStatus({ phase: "uploading", progress: 0, error: "" });
    setError("");

    try {
      const result = await uploadAssetWithProgress(file, {
        retries: 4,
        onProgress: (percent) =>
          setImageUploadStatus({
            phase: "uploading",
            progress: percent,
            error: "",
          }),
      });

      setFormData((prev) => ({ ...prev, image: result.url }));
      setImageUploadStatus({ phase: "success", progress: 100, error: "" });
    } catch (uploadError: unknown) {
      const message =
        uploadError instanceof Error && uploadError.message
          ? uploadError.message
          : "خطا در آپلود تصویر";
      setError(message);
      setImageUploadStatus({ phase: "error", progress: 0, error: message });
    } finally {
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name: formData.name.trim(),
      image: formData.image.trim(),
      bio: formData.bio.trim(),
      isDotTeamMember: formData.isDotTeamMember,
    };

    if (!payload.name || !payload.image || !payload.bio) {
      setError("نام، تصویر و معرفی کوتاه الزامی هستند");
      setLoading(false);
      return;
    }

    try {
      const result = person?.id
        ? await updatePerson(person.id, payload)
        : await createPerson(payload);

      if (result.success) {
        onSave();
      } else {
        setError(result.error || "خطا در ذخیره اطلاعات فرد");
      }
    } catch (submitError) {
      console.error(submitError);
      setError("خطا در ذخیره اطلاعات فرد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl text-slate-900 dark:text-slate-100"
    >
      <h2 className="text-2xl font-bold">
        {person?.id ? "ویرایش فرد" : "ایجاد فرد"}
      </h2>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">نام</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">معرفی کوتاه</label>
          <textarea
            value={formData.bio}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, bio: e.target.value }))
            }
            rows={4}
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">عکس</label>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              disabled={imageUploadStatus.phase === "uploading"}
              className="w-full px-4 py-2 border border-slate-300 rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <UploadStatus
              status={imageUploadStatus}
              uploadingLabel="در حال آپلود عکس..."
              successLabel="عکس با موفقیت آپلود شد"
              errorLabel="آپلود عکس انجام نشد"
            />
            {formData.image ? (
              <img
                src={getUploadUrl(formData.image) || ""}
                alt={formData.name || "Person"}
                className="h-36 w-full object-cover rounded-md"
              />
            ) : null}
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isDotTeamMember}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isDotTeamMember: e.target.checked,
              }))
            }
            className="h-4 w-4"
          />
          <span className="text-sm">عضو تیم دات است</span>
        </label>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button type="submit" disabled={loading}>
          {loading
            ? "در حال ذخیره..."
            : person?.id
              ? "بروزرسانی فرد"
              : "ایجاد فرد"}
        </Button>

        <Button
          type="button"
          onClick={onCancel}
          className="bg-slate-500 hover:bg-slate-600"
        >
          انصراف
        </Button>

        {person?.id ? (
          <Button
            type="button"
            onClick={async () => {
              if (!person?.id) return;

              if (confirm("آیا از حذف این فرد مطمئن هستید؟")) {
                const result = await deletePerson(person.id);
                if (!result.success) {
                  setError(result.error || "خطا در حذف فرد");
                  return;
                }
                onSave();
              }
            }}
            className="bg-red-500 hover:bg-red-600"
          >
            حذف
          </Button>
        ) : null}
      </div>
    </form>
  );
}
