import { Download } from "lucide-react";
import { Button } from "../ui/button";
import { exportExcel } from "../../lib/excelExport";

export default function ExcelButton({
  filename,
  sheets,
  disabled = false,
  label = "Excel",
  size = "sm",
  variant = "outline",
  className = "",
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={() => exportExcel(filename, sheets)}
    >
      <Download className="h-4 w-4 mr-1" /> {label}
    </Button>
  );
}
