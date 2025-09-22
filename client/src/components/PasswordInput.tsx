import { useState, forwardRef } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { TextInput, TextInputProps } from "flowbite-react";

interface PasswordInputProps extends TextInputProps {
  showPasswordToggle?: boolean;
  className?: string;
}

function PasswordInputBase(
  { showPasswordToggle = true, className, ...props }: PasswordInputProps,
  ref: React.Ref<HTMLInputElement>
) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`relative w-full ${className ?? ""}`}>
      <TextInput
        {...props}
        ref={ref}
        type={
          showPasswordToggle ? (showPassword ? "text" : "password") : "password"
        }
        rightIcon={showPasswordToggle ? () => null : undefined}
      />
      {showPasswordToggle && (
        <div
          className="absolute right-2 top-3.5 opacity-50 hover:cursor-pointer"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label="toggle hidden password"
        >
          {!showPassword && <FiEye aria-label="hide password" />}
          {showPassword && <FiEyeOff aria-label="show password" />}
        </div>
      )}
    </div>
  );
}

const PasswordInput = forwardRef(PasswordInputBase);

export default PasswordInput;
