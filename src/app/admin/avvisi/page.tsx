"use client";

import { useEffect, useState } from "react";
import { NoticesView } from "../NoticesView";
import { useAdmin } from "../AdminShell";
import * as db from "../data";
import type { EventItem } from "../types";

export default function AdminAvvisiPage() {
  const { supabase, clients, classes, typeById, clientNotices, announcements, sendPersonalNotices, deleteClientNotice, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useAdmin();
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => {
    db.fetchEvents(supabase).then(setEvents).catch(() => {});
  }, [supabase]);
  return (
    <NoticesView
      clients={clients}
      classes={classes}
      events={events}
      typeById={typeById}
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
