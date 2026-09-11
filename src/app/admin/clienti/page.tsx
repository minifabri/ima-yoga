"use client";

import { useEffect, useState } from "react";
import { COLORS } from "../colors";
import { Modal } from "../ui";
import { ClientsView } from "../ClientsView";
import { useAdmin } from "../AdminShell";

export default function AdminClientiPage() {
  const { clients, classes, typeById, upsertClient, deleteClientItem, setClientDisabled, mergeClients, resetClientPassword, getClientAuthStatus, resendClientActivation, resendClientPasswordReset, refreshClientsAndClasses, showToast } = useAdmin();
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refreshClients() {
    setRefreshing(true);
    try {
      await refreshClientsAndClasses();
    } catch {
      showToast("Aggiornamento non riuscito.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      refreshClientsAndClasses().catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ClientsView
        clients={clients}
        classes={classes}
        typeById={typeById}
        onUpsert={upsertClient}
        onDelete={(id) => setConfirmDeleteClient(id)}
        onSetDisabled={setClientDisabled}
        onMerge={mergeClients}
        onResetPassword={resetClientPassword}
        onGetAuthStatus={getClientAuthStatus}
        onResendActivation={resendClientActivation}
        onResendPasswordReset={resendClientPasswordReset}
        onRefresh={refreshClients}
        refreshing={refreshing}
      />

      {confirmDeleteClient && (
        <Modal onClose={() => setConfirmDeleteClient(null)} width={360}>
          <div className="p-5">
            <div className="font-semibold mb-1">Eliminare questo cliente?</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }} className="mb-4">
              Il cliente verrà rimosso anche da eventuali classi prenotate.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteClient(null)} className="px-3 py-2 rounded-lg text-sm font-medium" style={{ border: `1px solid ${COLORS.border}` }}>
                Annulla
              </button>
              <button
                onClick={() => {
                  deleteClientItem(confirmDeleteClient);
                  setConfirmDeleteClient(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: COLORS.danger }}
              >
                Elimina
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
