import { useWallet } from "../../context/WalletContext";
import "./WalletPickerModal.css";

export function WalletPickerModal({ onClose }) {
  const { availableWallets, connect } = useWallet();

  async function handlePick(uuid) {
    await connect(uuid);
    onClose();
  }

  return (
    <div className="wp-overlay" onClick={onClose}>
      <div className="wp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wp-head">
          <span>Choose a wallet</span>
          <button className="wp-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="wp-list">
          {availableWallets.map((w) => (
            <button
              key={w.info.uuid}
              className="wp-item"
              onClick={() => handlePick(w.info.uuid)}
            >
              <img src={w.info.icon} alt="" className="wp-item-icon" />
              <span>{w.info.name}</span>
            </button>
          ))}
          {window.ethereum && !availableWallets.some((w) => w.provider === window.ethereum) && (
            <button className="wp-item" onClick={() => handlePick(null)}>
              <span className="wp-item-icon wp-item-icon--fallback">🦊</span>
              <span>Browser wallet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
