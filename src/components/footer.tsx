export default function Footer() {
  return (
    <footer className="w-full py-6 border-t">
      <div className="container px-4 md:px-6 mx-auto flex flex-col sm:flex-row justify-between items-center">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          © {new Date().getFullYear()} Gacha Savior. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
