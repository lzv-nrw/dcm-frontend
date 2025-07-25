import { ReactNode, useEffect, useState } from "react";
import { Avatar, Badge, Spinner } from "flowbite-react";
import { FiX } from "react-icons/fi";

import { createGravatar } from "../utils/util";
import { PublicUserInfo } from "../types";
import { credentialsValue, host } from "../App";

interface UserBadge {
  title: string;
  onDismiss?: () => void;
}

interface UserDisplayProps {
  className?: string;
  id?: string;
  userInfo?: PublicUserInfo;
  outline?: boolean;
  badges?: UserBadge[];
  icon?: ReactNode;
  onClick?: React.MouseEventHandler;
}

export default function UserDisplay({
  className,
  id,
  userInfo: initialUserInfo,
  outline = false,
  badges,
  icon,
  onClick,
}: UserDisplayProps) {
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<PublicUserInfo | undefined>(
    initialUserInfo
  );

  // initialize public info
  useEffect(() => {
    if (initialUserInfo && initialUserInfo !== userInfo)
      setUserInfo(initialUserInfo);
  }, [userInfo, initialUserInfo]);
  useEffect(() => {
    if (!id || initialUserInfo) return;
    setUserInfoLoading(true);
    fetch(
      host + "/api/admin/user-info?" + new URLSearchParams({ id }).toString(),
      {
        credentials: credentialsValue,
      }
    )
      .then((response) => {
        setUserInfoLoading(false);
        if (!response.ok) {
          setUserInfo(undefined);
          return;
        }
        response.json().then((json) => setUserInfo(json));
      })
      .catch((error) => {
        setUserInfoLoading(false);
        console.error(error);
      });
  }, [id, initialUserInfo]);

  return userInfoLoading ? (
    <Spinner size="xs" />
  ) : userInfo ? (
    <div
      className={
        "relative flex flex-col space-y-2 justify-around " +
        (onClick ? "hover:cursor-pointer " : "") +
        (outline
          ? "px-3 py-2 outline outline-gray-300 outline-1 rounded-lg "
          : "px-2 py-1 ") +
        (className ?? "")
      }
      onClick={onClick}
    >
      <div className="flex items-center">
        <Avatar
          className="absolute"
          alt="user avatar"
          img={createGravatar(userInfo.email)}
          rounded
        />
        <div className="flex flex-col items-start ml-12 overflow-x-hidden space-y-1">
          <p className="dcm-clamp-text">
            {userInfo.firstname + " " + userInfo.lastname}
          </p>
          <p className="text-sm text-gray-500 dcm-clamp-text">
            {userInfo.username + ", " + userInfo.email}
          </p>
        </div>
      </div>
      {badges ? (
        <div className="flex gap-x-2 gap-y-1 flex-wrap">
          {badges.map((badge, index) => (
            <Badge
              key={index}
              color="gray"
              size="sm"
              className="whitespace-nowrap"
            >
              <div className="flex flex-row items-start space-x-1 ">
                <p>{badge.title}</p>
                {badge.onDismiss ? (
                  <FiX
                    onClick={badge.onDismiss}
                    className="text-gray-500 hover:text-black hover:cursor-pointer"
                  />
                ) : null}
              </div>
            </Badge>
          ))}
        </div>
      ) : null}
      {icon ?? null}
    </div>
  ) : (
    <div>-</div>
  );
}
