"use client";

import { PaymentsView } from "../PaymentsView";
import { useAdmin } from "../AdminShell";

export default function AdminPagamentiPage() {
  const {
    supabase,
    clients,
    classes,
    packagesWithUsage,
    ledger,
    typeById,
    settings,
    upsertClient,
    sellPackage,
    recordPackagePayment,
    updatePackageDetails,
    deletePackageItem,
    addLedgerEntry,
    deleteLedgerEntry,
    markClassPaymentPaid,
  } = useAdmin();

  return (
    <PaymentsView
      supabase={supabase}
      clients={clients}
      classes={classes}
      packages={packagesWithUsage}
      ledger={ledger}
      typeById={typeById}
      defaults={settings}
      onUpsertClient={upsertClient}
      onSellPackage={sellPackage}
      onRecordPackagePayment={recordPackagePayment}
      onUpdatePackageDetails={updatePackageDetails}
      onDeletePackage={deletePackageItem}
      onAddLedgerEntry={addLedgerEntry}
      onDeleteLedgerEntry={deleteLedgerEntry}
      onMarkClassPaymentPaid={markClassPaymentPaid}
    />
  );
}
