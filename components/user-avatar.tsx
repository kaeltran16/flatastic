import { Profile } from '@/lib/supabase/schema.alias';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils';
import Image from 'next/image';
import { useState } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
interface UserAvatarProps {
  user?: Pick<Profile, 'avatar_url' | 'full_name' | 'email'>;
  showAsYou?: boolean;
  className?: string;
  shouldShowName?: boolean;
}

const UserAvatar = ({
  user,
  showAsYou = false,
  className,
  shouldShowName = true,
}: UserAvatarProps) => {
  const [imageError, setImageError] = useState(false);

  const { avatar_url, full_name, email } = user || {};

  const displayFullName = showAsYou ? 'You' : full_name || email || 'User';
  return (
    <div className="flex items-center gap-2">
      <Avatar className={cn('w-8 h-8 sm:w-6 sm:h-6', className)}>
        {avatar_url && !imageError && (
          <Image
            src={avatar_url}
            alt={full_name || email || 'user_avatar'}
            fill
            className="aspect-square object-cover"
            sizes="(max-width: 640px) 24px, 28px"
            onError={() => setImageError(true)}
          />
        )}
        <AvatarFallback className="bg-gray-200 text-xs font-medium">
          {getInitials(displayFullName)}
        </AvatarFallback>
      </Avatar>
      {shouldShowName && (
        <span className="text-base sm:text-sm">{displayFullName}</span>
      )}
    </div>
  );
};

export default UserAvatar;
