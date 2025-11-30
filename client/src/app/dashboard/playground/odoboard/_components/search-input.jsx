"use client";

import { Search } from "lucide-react";
import { useDebounce } from "react-use";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/Components/ui/input";

export const SearchInput = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get("search") || "");
  const [debouncedValue, setDebouncedValue] = useState(value);

  useDebounce(() => setDebouncedValue(value), 400, [value]);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  useEffect(() => {
    const url = `/dashboard/playground/odoboard?search=${debouncedValue}`;
    router.push(url);
  }, [debouncedValue, router]);

  return (
    <div className="w-full relative">
      <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        className="w-full max-w-[516px] pl-9"
        placeholder="Search boards"
        onChange={handleChange}
        value={value}
      />
    </div>
  );
};
