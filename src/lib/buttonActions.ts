// Utility functions for special button actions

/**
 * Generate vCard content from contact info
 */
export const generateVCard = async (data: {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  company?: string;
  photoUrl?: string;
}) => {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${data.name}`,
  ];

  if (data.company) {
    lines.push(`ORG:${data.company}`);
  }
  if (data.phone) {
    lines.push(`TEL;TYPE=CELL:${data.phone}`);
  }
  if (data.email) {
    lines.push(`EMAIL:${data.email}`);
  }
  if (data.website) {
    lines.push(`URL:${data.website}`);
  }
  if (data.address) {
    lines.push(`ADR;TYPE=WORK:;;${data.address};;;;`);
  }
  if (data.instagram) {
    lines.push(`X-SOCIALPROFILE;TYPE=instagram:${data.instagram}`);
  }
  if (data.facebook) {
    lines.push(`X-SOCIALPROFILE;TYPE=facebook:${data.facebook}`);
  }

  // Add photo if available
  if (data.photoUrl) {
    try {
      const response = await fetch(data.photoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g. "data:image/webp;base64,")
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${base64}`);
    } catch (e) {
      console.warn('Failed to fetch vCard photo, skipping:', e);
    }
  }

  lines.push('END:VCARD');
  return lines.join('\n');
};

/**
 * Download vCard file
 */
export const downloadVCard = (vCardContent: string, fileName: string) => {
  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate Wi-Fi connection string (for QR code or direct connection)
 * Format: WIFI:T:WPA;S:networkName;P:password;;
 */
export const generateWifiString = (data: {
  ssid: string;
  password: string;
  encryption?: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}) => {
  const encryption = data.encryption || 'WPA';
  const hidden = data.hidden ? 'true' : 'false';
  return `WIFI:T:${encryption};S:${data.ssid};P:${data.password};H:${hidden};;`;
};

/**
 * Parse Wi-Fi data from URL field
 * Expected format: ssid|password|encryption
 */
export const parseWifiData = (url: string) => {
  const parts = url.split('|');
  return {
    ssid: parts[0] || '',
    password: parts[1] || '',
    encryption: (parts[2] as 'WPA' | 'WEP' | 'nopass') || 'WPA',
  };
};

/**
 * Parse PIX data from URL field
 * Expected format: pixKey|amount|description
 */
export const parsePixData = (url: string) => {
  const parts = url.split('|');
  return {
    pixKey: parts[0] || '',
    amount: parts[1] ? parseFloat(parts[1]) : undefined,
    description: parts[2] || '',
  };
};

/**
 * Generate PIX copy-paste payload (simplified static PIX)
 */
export const generatePixPayload = (data: {
  pixKey: string;
  amount?: number;
  merchantName?: string;
  description?: string;
}) => {
  // For now, return just the PIX key for copy functionality
  // A full EMV implementation would be needed for QR codes
  return data.pixKey;
};

/**
 * Parse vCard data from URL field
 * Expected format: name|phone|email|website|address|instagram|facebook|company
 */
export const parseVCardData = (url: string) => {
  const parts = url.split('|');
  return {
    name: parts[0] || '',
    phone: parts[1] || '',
    email: parts[2] || '',
    website: parts[3] || '',
    address: parts[4] || '',
    instagram: parts[5] || '',
    facebook: parts[6] || '',
    company: parts[7] || '',
    photoUrl: parts[8] || '',
  };
};

/**
 * Check if button type requires special handling
 */
export const isSpecialButtonType = (icon: string) => {
  return ['Wifi', 'QrCode', 'Star', 'Calendar', 'Contact'].includes(icon);
};
