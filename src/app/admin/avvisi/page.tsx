"use client";

import { NoticesView } from "../NoticesView";
import { useAdmin } from "../AdminShell";

export default function AdminAvvisiPage() {
  const { clients, clientNotices, announcements, sendPersonalNotices, deleteClientNotice, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useAdmin();
  return (
    <NoticesView
      clients={clients}
      clientNotices={clientNotices}
      announcements={announcements}
      onSendNotice={sendPersonalNotices}
      onDeleteNotice={deleteClientNotice}
      onAddAnnouncement={addAnnouncement}
      onUpdateAnnouncement={updateAnnouncement}
      onRemoveAnnouncement={deleteAnnouncement}
    />
  );
}
