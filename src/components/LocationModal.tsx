import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { CustomerAddress, DeliveryLocation } from '../types';
import {
  getStoredAddresses,
  saveCustomerAddress,
  deleteCustomerAddress,
  setSelectedAddressId,
  getSelectedAddressId,
  addressToDeliveryLocation,
  validateCustomerAddress,
  AddressFormValidationErrors,
} from '../services/addressService';
import { vibrateFeedback, vibrateSuccess } from '../utils/haptics';
import { useLanguage } from '../i18n';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: DeliveryLocation | null;
  onSelectLocation: (location: DeliveryLocation) => void;
  userId?: string;
}

const DEFAULT_FORM_STATE = {
  fullName: '',
  mobile: '',
  houseNo: '',
  street: '',
  village: '',
};

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  selectedLocation: _selectedLocation,
  onSelectLocation,
  userId,
}) => {
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form mode: 'list' (if addresses exist) or 'form' (add / edit)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('form');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs state: STRICTLY 5 fields only
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<AddressFormValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load stored addresses on modal open
  useEffect(() => {
    if (!isOpen) return;

    const stored = getStoredAddresses(userId);
    setAddresses(stored);

    const activeId = getSelectedAddressId(userId);
    if (activeId && stored.some((a) => a.id === activeId)) {
      setSelectedId(activeId);
    } else if (stored.length > 0) {
      setSelectedId(stored[0].id);
    } else {
      setSelectedId(null);
    }

    // If customer already has saved addresses, open in list view; otherwise open form directly
    if (stored.length > 0) {
      setViewMode('list');
    } else {
      setViewMode('form');
      setEditingId(null);
      setFormData(DEFAULT_FORM_STATE);
    }

    setErrors({});
    setSuccessMessage(null);
  }, [isOpen, userId]);

  if (!isOpen) return null;

  // Handle Input Changes
  const handleInputChange = (field: keyof typeof DEFAULT_FORM_STATE, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Open Form to Add New Address
  const handleAddNew = () => {
    vibrateFeedback();
    setEditingId(null);
    setFormData(DEFAULT_FORM_STATE);
    setErrors({});
    setSuccessMessage(null);
    setViewMode('form');
  };

  // Open Form to Edit Existing Address
  const handleEdit = (addr: CustomerAddress) => {
    vibrateFeedback();
    setEditingId(addr.id);
    setFormData({
      fullName: addr.fullName,
      mobile: addr.mobile,
      houseNo: addr.houseNo,
      street: addr.street,
      village: addr.village || addr.city || '',
    });
    setErrors({});
    setSuccessMessage(null);
    setViewMode('form');
  };

  // Delete an Address
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    vibrateFeedback();
    if (window.confirm('Are you sure you want to delete this delivery address?')) {
      const remaining = deleteCustomerAddress(id, userId);
      setAddresses(remaining);

      if (remaining.length === 0) {
        setViewMode('form');
        setEditingId(null);
        setFormData(DEFAULT_FORM_STATE);
        setSelectedId(null);
      } else {
        const nextActive = remaining[0];
        setSelectedId(nextActive.id);
        const loc = addressToDeliveryLocation(nextActive);
        onSelectLocation(loc);
      }
    }
  };

  // Save Address
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    vibrateFeedback();

    const validationErrors = validateCustomerAddress(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = saveCustomerAddress(
        {
          fullName: formData.fullName.trim(),
          mobile: formData.mobile.trim(),
          houseNo: formData.houseNo.trim(),
          street: formData.street.trim(),
          village: formData.village.trim(),
        },
        editingId || undefined,
        userId
      );

      vibrateSuccess();
      setSuccessMessage('Address Saved Successfully');

      const updatedList = getStoredAddresses(userId);
      setAddresses(updatedList);
      setSelectedId(saved.id);

      // Convert to delivery location and pass to app (updates Home header with saved village name)
      const deliveryLoc = addressToDeliveryLocation(saved);
      onSelectLocation(deliveryLoc);

      // Brief delay to show feedback then close
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save address:', err);
      setIsSubmitting(false);
    }
  };

  // Select Address from List
  const handleSelectFromList = (addr: CustomerAddress) => {
    vibrateFeedback();
    setSelectedId(addr.id);
    setSelectedAddressId(addr.id, userId);
    const deliveryLoc = addressToDeliveryLocation(addr);
    onSelectLocation(deliveryLoc);
    onClose();
  };

  return (
    <div
      id="location-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="delivery-address-dialog"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-address-title"
      >
        {/* Header */}
        <div className="bg-[#064e3b] text-white px-4 py-3.5 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            {viewMode === 'form' && addresses.length > 0 && (
              <button
                type="button"
                id="address-back-btn"
                onClick={() => {
                  vibrateFeedback();
                  setViewMode('list');
                }}
                className="w-7 h-7 rounded-full bg-emerald-800/80 hover:bg-emerald-700 flex items-center justify-center transition-colors mr-0.5 cursor-pointer"
                aria-label="Back to saved addresses"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-emerald-700/80 flex items-center justify-center text-emerald-200 shrink-0">
              <MapPin className="w-4 h-4 fill-emerald-300 text-emerald-300" />
            </div>
            <div>
              <h2
                id="delivery-address-title"
                className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5"
              >
                <span>{t('address.title')}</span>
              </h2>
              <p className="text-[11px] text-emerald-200 font-medium">
                {viewMode === 'list'
                  ? t('address.savedAddresses')
                  : editingId
                  ? t('address.editAddress')
                  : t('address.enterDetails')}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-address-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-800/80 hover:bg-emerald-700 active:scale-95 text-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close address dialog"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Success Notification Banner */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 flex items-center justify-center gap-2 text-emerald-900 font-extrabold text-xs animate-in slide-in-from-top duration-200 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* VIEW 1: SAVED ADDRESSES LIST */}
          {viewMode === 'list' && addresses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {t('address.savedAddresses')} ({addresses.length})
                </span>
                <button
                  type="button"
                  id="add-new-address-btn"
                  onClick={handleAddNew}
                  className="text-xs font-extrabold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('address.addNew')}</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {addresses.map((addr) => {
                  const isSelected = selectedId === addr.id;
                  const villageDisplay = addr.village || addr.city;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectFromList(addr)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col gap-2 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-gray-900">
                            {addr.fullName}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {addr.mobile}
                          </span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                            isSelected
                              ? 'bg-[#064e3b] border-[#064e3b] text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {addr.houseNo}, {addr.street}, <span className="font-bold text-gray-900">{villageDisplay}</span>
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-1">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded">
                          {isSelected ? `✓ ${t('address.activeLocation')}` : t('address.deliverHere')}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(addr);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{t('profile.editBtn')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(addr.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t('common.clear')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: SIMPLE ADDRESS INPUT FORM (STRICTLY 5 FIELDS ONLY) */}
          {viewMode === 'form' && (
            <form onSubmit={handleSaveAddress} className="space-y-3.5">
              {/* 1. Full Name */}
              <div>
                <label
                  htmlFor="address-fullname-input"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  {t('address.fullName')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="address-fullname-input"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder={t('address.fullNamePlaceholder')}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all ${
                    errors.fullName
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  }`}
                />
                {errors.fullName && (
                  <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                    {errors.fullName}
                  </span>
                )}
              </div>

              {/* 2. Mobile Number */}
              <div>
                <label
                  htmlFor="address-mobile-input"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  {t('address.mobile')} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-gray-500 select-none">
                    +91
                  </span>
                  <input
                    id="address-mobile-input"
                    type="tel"
                    maxLength={10}
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      handleInputChange('mobile', val);
                    }}
                    placeholder={t('address.mobilePlaceholder')}
                    className={`w-full pl-11 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all ${
                      errors.mobile
                        ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                    }`}
                  />
                </div>
                {errors.mobile && (
                  <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                    {errors.mobile}
                  </span>
                )}
              </div>

              {/* 3. House */}
              <div>
                <label
                  htmlFor="address-house-input"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  {t('address.house')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="address-house-input"
                  type="text"
                  value={formData.houseNo}
                  onChange={(e) => handleInputChange('houseNo', e.target.value)}
                  placeholder={t('address.housePlaceholder')}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all ${
                    errors.houseNo
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  }`}
                />
                {errors.houseNo && (
                  <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                    {errors.houseNo}
                  </span>
                )}
              </div>

              {/* 4. Street / Area */}
              <div>
                <label
                  htmlFor="address-street-input"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  {t('address.street')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="address-street-input"
                  type="text"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  placeholder={t('address.streetPlaceholder')}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all ${
                    errors.street
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  }`}
                />
                {errors.street && (
                  <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                    {errors.street}
                  </span>
                )}
              </div>

              {/* 5. Village */}
              <div>
                <label
                  htmlFor="address-village-input"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  {t('address.village')} <span className="text-red-500">*</span>
                </label>
                <input
                  id="address-village-input"
                  type="text"
                  value={formData.village}
                  onChange={(e) => handleInputChange('village', e.target.value)}
                  placeholder={t('address.villagePlaceholder')}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all ${
                    errors.village
                      ? 'border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                      : 'border-gray-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  }`}
                />
                {errors.village && (
                  <span className="text-[11px] text-red-600 font-semibold mt-1 block">
                    {errors.village}
                  </span>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {addresses.length > 0 && (
                  <button
                    type="button"
                    id="cancel-address-edit-btn"
                    onClick={() => {
                      vibrateFeedback();
                      setViewMode('list');
                    }}
                    className="py-3 px-4 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 active:scale-98 transition-all cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                )}

                <button
                  type="submit"
                  id="save-address-btn"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#064e3b] hover:bg-[#043c2d] active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {isSubmitting
                      ? t('address.savingBtn')
                      : editingId
                      ? t('address.updateBtn')
                      : t('address.saveBtn')}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
