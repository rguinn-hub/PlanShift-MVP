import { useState } from "react";
import { Plus, X, FolderOpen, Trash2, AlertTriangle, Home as HomeIcon } from "lucide-react";
import type { Campaign } from "../lib/types";
import { Logo } from "./Logo";

interface Props {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  onSelect: (campaign: Campaign) => void;
  onNewCampaign: () => void;
  onHome: () => void;
  onDeleteCampaign: (campaign: Campaign) => Promise<void>;
  onClose: () => void;
}

export default function Sidebar({
  campaigns,
  activeCampaignId,
  onSelect,
  onNewCampaign,
  onHome,
  onDeleteCampaign,
  onClose,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteClick = (campaign: Campaign, event: React.MouseEvent) => {
    event.stopPropagation();
    setConfirmDelete(campaign);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    await onDeleteCampaign(confirmDelete);
    setDeletingId(null);
    setConfirmDelete(null);
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <aside style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <Logo />
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: "var(--space-2)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={sidebarBodyStyle}>
          <button className="btn btn-secondary" style={newCampaignBtnStyle} onClick={onHome}>
            <HomeIcon size={18} />
            Home
          </button>

          <button className="btn btn-primary" style={newCampaignBtnStyle} onClick={onNewCampaign}>
            <Plus size={18} />
            New Campaign
          </button>

          <div style={listLabelStyle}>Campaigns</div>
          {campaigns.length === 0 ? (
            <p style={emptyTextStyle}>
              No campaigns yet. Create one to get started.
            </p>
          ) : (
            <div style={listStyle}>
              {campaigns.map((c) => {
                const isActive = c.id === activeCampaignId;
                return (
                  <div
                    key={c.id}
                    style={isActive ? campaignItemActiveStyle : campaignItemStyle}
                    onClick={() => onSelect(c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onSelect(c);
                    }}
                  >
                    {isActive && <div style={activeBarStyle} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={campaignNameStyle(isActive)}>
                        {c.business_name}
                      </div>
                      <div style={campaignGoalStyle}>
                        {c.goal}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="campaign-delete-btn"
                      style={deleteBtnStyle}
                      onClick={(event) => handleDeleteClick(c, event)}
                      aria-label={`Delete ${c.business_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={sidebarFooterStyle}>
          <FolderOpen size={16} color="var(--neutral-400)" />
          <span style={footerTextStyle}>
            {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}
          </span>
        </div>
      </aside>

      {confirmDelete && (
        <div style={confirmOverlayStyle} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConfirmDelete(null)}>
          <div style={confirmModalStyle} role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title">
            <div style={confirmIconStyle}>
              <AlertTriangle size={22} />
            </div>
            <h3 id="delete-confirm-title" style={confirmTitleStyle}>Delete campaign?</h3>
            <p style={confirmTextStyle}>
              Are you sure you want to delete <strong>{confirmDelete.business_name}</strong>? This will permanently remove the campaign and all of its tasks. This cannot be undone.
            </p>
            <div style={confirmActionsStyle}>
              <button className="btn btn-secondary" type="button" onClick={() => setConfirmDelete(null)} disabled={deletingId !== null}>Cancel</button>
              <button className="btn btn-danger" type="button" onClick={handleConfirmDelete} disabled={deletingId !== null}>
                {deletingId === confirmDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(28, 25, 22, 0.3)",
  zIndex: 50,
  display: "block",
};

const sidebarStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  bottom: 0,
  width: 280,
  background: "var(--neutral-50)",
  borderRight: "1px solid var(--neutral-200)",
  display: "flex",
  flexDirection: "column",
  zIndex: 51,
  overflowY: "auto",
};

const sidebarHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-4) var(--space-5)",
  borderBottom: "1px solid var(--neutral-200)",
  flexShrink: 0,
};

const sidebarBodyStyle: React.CSSProperties = {
  flex: 1,
  padding: "var(--space-5)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
};

const newCampaignBtnStyle: React.CSSProperties = {
  width: "100%",
  justifyContent: "center",
};

const listLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--neutral-400)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginTop: "var(--space-2)",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
};

const campaignItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-4)",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  transition: "background-color 0.15s",
  border: "none",
  position: "relative",
};

const campaignItemActiveStyle: React.CSSProperties = {
  ...campaignItemStyle,
  background: "var(--accent-50)",
};

const activeBarStyle: React.CSSProperties = {
  position: "absolute",
  left: 0,
  top: "var(--space-2)",
  bottom: "var(--space-2)",
  width: 3,
  borderRadius: "2px",
  background: "var(--accent-600)",
};

const deleteBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: "var(--space-1)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: "var(--neutral-400)",
  cursor: "pointer",
  opacity: 1,
  transition: "color 0.15s, background-color 0.15s",
};

const campaignNameStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 600,
  color: active ? "var(--accent-700)" : "var(--neutral-800)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const campaignGoalStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--neutral-400)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginTop: 2,
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-400)",
  lineHeight: 1.5,
};

const sidebarFooterStyle: React.CSSProperties = {
  padding: "var(--space-4) var(--space-5)",
  borderTop: "1px solid var(--neutral-200)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
  flexShrink: 0,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--neutral-400)",
};

const confirmOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-5)",
  background: "rgba(13, 27, 51, 0.42)",
};

const confirmModalStyle: React.CSSProperties = {
  width: "min(100%, 420px)",
  background: "var(--neutral-0)",
  border: "1px solid var(--neutral-200)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
  padding: "var(--space-6)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
};

const confirmIconStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "var(--error-50)",
  color: "var(--error-600)",
  marginBottom: "var(--space-3)",
};

const confirmTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  color: "var(--neutral-900)",
};

const confirmTextStyle: React.CSSProperties = {
  margin: "var(--space-2) 0 var(--space-5)",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--neutral-600)",
};

const confirmActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "var(--space-3)",
  width: "100%",
};
