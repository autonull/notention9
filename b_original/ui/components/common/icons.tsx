import React from 'react';
import { OutlineIcon, SolidIcon, BaseIcon, IconProps } from './Icon';

export type { IconProps };

export const NoteIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </OutlineIcon>
);

export const ArrowPathIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </OutlineIcon>
);

export const PlayIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path
      fillRule="evenodd"
      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
      clipRule="evenodd"
    />
  </SolidIcon>
);

export const PauseIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path
      fillRule="evenodd"
      d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
      clipRule="evenodd"
    />
  </SolidIcon>
);

export const HomeIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </OutlineIcon>
);

export const CpuChipIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z"
    />
  </OutlineIcon>
);

export const PinIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
    />
  </OutlineIcon>
);

export const LockIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </OutlineIcon>
);

export const ChevronUpIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 15.75l7.5-7.5 7.5 7.5"
    />
  </OutlineIcon>
);

export const OntologyIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10m-2 5a8 8 0 0111.314-11.314M12 21a9 9 0 110-18 9 9 0 010 18z"
    />
  </OutlineIcon>
);

export const NetworkIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </OutlineIcon>
);

export const ChatIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </OutlineIcon>
);

export const SettingsIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </OutlineIcon>
);

export const PlusIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </OutlineIcon>
);

export const TrashIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </OutlineIcon>
);

export const SparklesIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6.343 6.343l2.829 2.829m11.313-2.829l-2.829 2.829M5 21v-4M3 19h4m11.313 2.829l-2.829-2.829M19 3l-2.829 2.829M12 2v2m0 16v2M4.5 12H2m18 0h-2.5m-5 0a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </OutlineIcon>
);

export const LoadingSpinner = ({ className, ...props }: IconProps) => (
  <BaseIcon
    className={`animate-spin ${className || ''}`}
    {...props}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </BaseIcon>
);

export const KeyIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
    />
  </OutlineIcon>
);

export const UserPlusIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.5 21c-2.39 0-4.58-.946-6.178-2.502z"
    />
  </OutlineIcon>
);

export const UserGroupIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    />
  </OutlineIcon>
);

export const WorldIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 01-.364-17.978A9 9 0 0112 21zm0-15.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12h19.5M12 2.25c-2.98 0-5.68 1.7-6.94 4.06M18.94 16.06A7.01 7.01 0 0012 2.25"
    />
  </OutlineIcon>
);

export const EditIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </OutlineIcon>
);

export const SendIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </SolidIcon>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
    />
  </OutlineIcon>
);

export const ArrowRightIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
    />
  </OutlineIcon>
);

export const ArrowUpIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
    />
  </OutlineIcon>
);

export const ArrowDownIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
    />
  </OutlineIcon>
);

export const ChevronDownIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </OutlineIcon>
);

export const PlusCircleIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </OutlineIcon>
);

export const CodeBracketsIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 15"
    />
  </OutlineIcon>
);

export const CubeIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path
      fillRule="evenodd"
      d="M1.5 6.375c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 17.625V6.375zM6 12a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 12zm.75 3.75a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H6.75z"
      clipRule="evenodd"
    />
  </SolidIcon>
);

export const CubeTransparentIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9.75l-9-5.25M12 7.5l9 5.25"
    />
  </OutlineIcon>
);

export const TagIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 8.25h13.5m-13.5 7.5h13.5m-1.875-11.25a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zM19.5 8.25a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zM19.5 15.75a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0z"
    />
  </OutlineIcon>
);

export const DocumentDuplicateIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75c-.621 0-1.125-.504-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m9.375 2.25c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-3.375c0-.621.504-1.125 1.125-1.125h1.5z"
    />
  </OutlineIcon>
);

export const ClipboardIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </OutlineIcon>
);

export const XCircleIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </OutlineIcon>
);

export const CheckCircleIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </OutlineIcon>
);

export const InformationCircleIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
    />
  </OutlineIcon>
);

export const ExclamationTriangleIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </OutlineIcon>
);

export const XMarkIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </OutlineIcon>
);

export const SearchIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </OutlineIcon>
);

export const MapIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20l-5.447-2.724A1.99 1.99 0 013 15.382V5.618a1.99 1.99 0 011.553-1.94L9 1m0 19l6-3m-6 3V1m6 16l5.447 2.724A1.99 1.99 0 0021 17.618V7.382a1.99 1.99 0 00-1.553-1.94L15 3m0 14V3m0 0l-6 2m6-2l6-2"
    />
  </OutlineIcon>
);

export const MapPinIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
    />
  </OutlineIcon>
);

export const FolderIcon = (props: IconProps) => (
    <OutlineIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </OutlineIcon>
);

export const MergeIcon = (props: IconProps) => (
    <OutlineIcon {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </OutlineIcon>
);

export const CheckIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </OutlineIcon>
);

export const XIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </OutlineIcon>
);

export const PencilIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </OutlineIcon>
);

// Toolbar Icons
export const BoldIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M8 11h4.5a2.5 2.5 0 100-5H8v5zm10 4.5a4.5 4.5 0 01-4.5 4.5H6V11h8.5a4.5 4.5 0 010 9z" />
  </SolidIcon>
);
export const ItalicIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M10 5h2.5l-4.5 14H5.5l4.5-14zM14.5 5H17l-4.5 14h-2.5l4.5-14z" />
  </SolidIcon>
);

export const StrikethroughIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3 11h18v2H3v-2zm12.5-3.01a3.5 3.5 0 00-3.13 2.01H11V12h2.25c.34-1.12 1.3-2 2.5-2 .28 0 .55.04.81.12V5H8v3h1.5v-.5h2V10h-6v2h5.5v1.5H9v2h2.5v.5H10V18h8v-3h-1.5v.5h-2V13h6v-2h-5.5a3.5 3.5 0 003-4.99z" />
  </SolidIcon>
);
export const Heading1Icon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3 3h2v8h4V3h2v18H9v-8H5v8H3V3zm12 4h-2v14h-2V7h-2V5h6v2zm4 8v-2h-2v2h2zm0 2h-2v2h2v-2z" />
  </SolidIcon>
);
export const Heading2Icon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3 3h2v8h4V3h2v18H9v-8H5v8H3V3zm11 14.5a4.5 4.5 0 01-4.5-4.5V11h2v2a2.5 2.5 0 005 0V7h-6V5h8v8.5a4.5 4.5 0 01-4.5 4.5z" />
  </SolidIcon>
);
export const Heading3Icon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3 3h2v8h4V3h2v18H9v-8H5v8H3V3zm11 4.5a3.5 3.5 0 013.5 3.5v1a3.5 3.5 0 01-3.5 3.5h-2v-2h2a1.5 1.5 0 001.5-1.5v-1A1.5 1.5 0 0016 9.5h-2V5h6v2.5a3.5 3.5 0 01-3.5 3.5V14a3.5 3.5 0 013.5 3.5V20h-6v-2.5a3.5 3.5 0 013.5-3.5h.5a1.5 1.5 0 000-3h-.5a3.5 3.5 0 01-3.5-3.5V5h2v2.5z" />
  </SolidIcon>
);
export const ListUlIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M4 11h4a1 1 0 110 2H4a1 1 0 110-2zm0-6h4a1 1 0 110 2H4a1 1 0 110-2zm0 12h4a1 1 0 110 2H4a1 1 0 110-2zM11 6h10v2H11V6zm0 6h10v2H11v-2zm0 6h10v2H11v-2z" />
  </SolidIcon>
);
export const ListOlIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3.25 10.25h1.5v-1.5H3.25v-1H5.5V9h-1.5v1.25H5.5v1H3.25v-1.25zm-.75 6H5.5v-1H4v-.5h1.5v-1H4v-.5H5.5v-1H2.5v4.5zm1-5v-4h3V5h-5v1.25h2zm7.5-3.5h10v2H11V8zm0 6h10v2H11v-2zm0-12h10v2H11V2zm0 18h10v2H11v-2z" />
  </SolidIcon>
);
export const QuoteIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
  </SolidIcon>
);
export const CodeBlockIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M4 3a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2H4zm14.59 7.41L15.17 14l3.42 3.41L17.17 19l-5-5 5-5 1.42 1.41zM8.83 5L3.83 10l5 5L10.25 13.59 6.67 10l3.58-3.59L8.83 5z" />
  </SolidIcon>
);
export const LinkIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M17 7h-4v2h4a2 2 0 012 2v2a2 2 0 01-2 2h-4v2h4a4 4 0 004-4v-2a4 4 0 00-4-4zM7 17h4v-2H7a2 2 0 01-2-2v-2a2 2 0 012-2h4V7H7a4 4 0 00-4 4v2a4 4 0 004 4zm-2-7h12v2H5v-2z" />
  </SolidIcon>
);
export const HorizontalRuleIcon = (props: IconProps) => (
  <SolidIcon {...props}>
    <path d="M3 11h18v2H3v-2z" />
  </SolidIcon>
);

export const HelpIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </OutlineIcon>
);

export const SearchSparkleIcon = (props: IconProps) => (
    <SolidIcon {...props}>
        <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clipRule="evenodd" />
    </SolidIcon>
);

export const SidebarIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
    />
  </OutlineIcon>
);

export const DownloadIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </OutlineIcon>
);

export const ClockIcon = (props: IconProps) => (
  <OutlineIcon {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </OutlineIcon>
);
