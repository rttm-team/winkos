import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  Edit3,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Ban,
  RotateCcw,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { ProspectStatus } from '../types';

interface PlayerActionOverflowMenuProps {
  isAdmin?: boolean;
  onSync?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePromotion?: () => void;
  onToggleProtection?: () => void;
  onToggleStatus?: () => void;
  isPromoted?: boolean;
  isProtected?: boolean;
  isProtectionEligible?: boolean;
  isMandatoryPromotion?: boolean;
  status?: ProspectStatus;
  isSyncing?: boolean;
  buttonClassName?: string;
  align?: 'left' | 'right';
}

interface MenuCoords {
  top: number;
  left: number;
  openUp: boolean;
}

export const PlayerActionOverflowMenu: React.FC<PlayerActionOverflowMenuProps> = ({
  isAdmin = false,
  onSync,
  onEdit,
  onDelete,
  onTogglePromotion,
  onToggleProtection,
  onToggleStatus,
  isPromoted = false,
  isProtected = false,
  isProtectionEligible = true,
  isMandatoryPromotion = false,
  status,
  isSyncing = false,
  buttonClassName = '',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<MenuCoords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback((): MenuCoords | null => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 216; // w-[216px] for comfortable action labels
    const menuHeight = 220; // max expected menu height with all actions

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    // Boundary check so menu doesn't overflow screen horizontally
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    const top = openUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 6;

    return { top, left, openUp };
  }, [align]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      const coords = calculatePosition();
      setMenuCoords(coords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Recalculate on open in case button moved
    const coords = calculatePosition();
    if (coords) setMenuCoords(coords);

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      // Don't close if user scrolls inside the menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  const hasRosterActions = isAdmin && Boolean(onTogglePromotion || onToggleProtection);
  const hasManagementActions = Boolean(onSync || (isAdmin && onEdit));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-600 transition-colors cursor-pointer ${
          isOpen ? 'bg-slate-700 text-cyan-300 border-cyan-500/50' : ''
        } ${buttonClassName}`}
        title="More player actions"
        aria-label="More actions"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen &&
        menuCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              zIndex: 9999,
            }}
            className="w-[216px] rounded-xl border border-slate-700/90 bg-slate-900/95 py-1.5 shadow-2xl backdrop-blur-md ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Roster & Eligibility Actions - Admins Only */}
            {isAdmin && onTogglePromotion && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onTogglePromotion();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                  isPromoted
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-amber-300'
                    : isMandatoryPromotion
                    ? 'text-red-300 hover:bg-red-500/15 hover:text-red-200'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-300'
                }`}
              >
                {isPromoted ? (
                  <>
                    <ArrowDownCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>Demote to Prospects</span>
                  </>
                ) : (
                  <>
                    <ArrowUpCircle
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isMandatoryPromotion ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    />
                    <span>{isMandatoryPromotion ? 'Promote (Mandatory)' : 'Promote to Roster'}</span>
                  </>
                )}
              </button>
            )}

            {isAdmin && onToggleProtection && (
              <>
                {!isProtectionEligible ? (
                  <button
                    type="button"
                    disabled
                    title="Ineligible for protection: exceeded maximum NHL games limit"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-500 transition-colors opacity-60 cursor-not-allowed text-left"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Protection Ineligible</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onToggleProtection();
                    }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                      isProtected
                        ? 'text-cyan-300 hover:bg-slate-800 hover:text-cyan-200'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300'
                    }`}
                  >
                    {isProtected ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span>Remove Protection</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>Protect Player</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}

            {/* Trash 'em / Restore - Available to ALL GMs */}
            {onToggleStatus && (() => {
              const isTrashed = status === 'trashed' || status === 'inactive';
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onToggleStatus();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                    isTrashed
                      ? 'text-emerald-300 hover:bg-emerald-950/50 hover:text-emerald-200'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-rose-300'
                  }`}
                >
                  {isTrashed ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Restore from Trashed</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span>Trash 'em</span>
                    </>
                  )}
                </button>
              );
            })()}

            {/* Divider between roster actions and management actions */}
            {hasRosterActions && (hasManagementActions || (isAdmin && onDelete)) && (
              <div className="my-1 border-t border-slate-800" />
            )}

            {/* Commish Feature: Live NHL Sync */}
            {isAdmin && onSync && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onSync();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                  isSyncing
                    ? 'text-cyan-400 bg-cyan-950/40 cursor-wait'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300'
                }`}
                title="Pulls live stats from NHL API and updates Supabase DB"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <div className="flex flex-col">
                  <span>{isSyncing ? 'Syncing NHL API...' : 'NHL Sync'}</span>
                  <span className="text-[10px] text-slate-500 font-normal">Pull stats & update DB</span>
                </div>
              </button>
            )}

            {/* Edit Prospect - Admins Only */}
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-amber-300 transition-colors cursor-pointer text-left"
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Edit Prospect</span>
              </button>
            )}

            {/* Delete Prospect - Admins Only */}
            {isAdmin && onDelete && (
              <>
                <div className="my-1 border-t border-slate-800" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer text-left"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span>Delete Prospect</span>
                </button>
              </>
            )}

            {/* Helpful indicator for non-admins */}
            {!isAdmin && (
              <div className="mt-1 border-t border-slate-800/80 px-3 py-1.5 text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-950/40">
                <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                <span>Admin only: Edit, Delete, Promote, Protect</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
