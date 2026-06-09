import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";
import { useState } from "react";

export default function Home() {
  const [category, setCategory] = useState("All");

  return (
    <main className="flex-1 p-4">
      <CategoryTabs activeCategory={category} onCategoryChange={setCategory} />
      <Videogrid category={category} />
    </main>
  );
}
