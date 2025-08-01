// Optimized Radix UI imports to reduce bundle size
// Instead of importing from individual packages, use this centralized import

// Accordion
export {
  Root as Accordion,
  Item as AccordionItem,
  Header as AccordionHeader,
  Trigger as AccordionTrigger,
  Content as AccordionContent,
} from '@radix-ui/react-accordion';

// Alert Dialog
export {
  Root as AlertDialog,
  Trigger as AlertDialogTrigger,
  Portal as AlertDialogPortal,
  Overlay as AlertDialogOverlay,
  Content as AlertDialogContent,
  Header as AlertDialogHeader,
  Footer as AlertDialogFooter,
  Title as AlertDialogTitle,
  Description as AlertDialogDescription,
  Action as AlertDialogAction,
  Cancel as AlertDialogCancel,
} from '@radix-ui/react-alert-dialog';

// Dialog
export {
  Root as Dialog,
  Trigger as DialogTrigger,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Header as DialogHeader,
  Footer as DialogFooter,
  Title as DialogTitle,
  Description as DialogDescription,
  Close as DialogClose,
} from '@radix-ui/react-dialog';

// Dropdown Menu
export {
  Root as DropdownMenu,
  Trigger as DropdownMenuTrigger,
  Portal as DropdownMenuPortal,
  Content as DropdownMenuContent,
  Arrow as DropdownMenuArrow,
  Item as DropdownMenuItem,
  CheckboxItem as DropdownMenuCheckboxItem,
  RadioItem as DropdownMenuRadioItem,
  Label as DropdownMenuLabel,
  Separator as DropdownMenuSeparator,
  Shortcut as DropdownMenuShortcut,
  Group as DropdownMenuGroup,
  RadioGroup as DropdownMenuRadioGroup,
  Sub as DropdownMenuSub,
  SubContent as DropdownMenuSubContent,
  SubTrigger as DropdownMenuSubTrigger,
} from '@radix-ui/react-dropdown-menu';

// Select
export {
  Root as Select,
  Trigger as SelectTrigger,
  Value as SelectValue,
  Icon as SelectIcon,
  Portal as SelectPortal,
  Content as SelectContent,
  Viewport as SelectViewport,
  Group as SelectGroup,
  Label as SelectLabel,
  Item as SelectItem,
  ItemText as SelectItemText,
  ItemIndicator as SelectItemIndicator,
  ScrollUpButton as SelectScrollUpButton,
  ScrollDownButton as SelectScrollDownButton,
  Separator as SelectSeparator,
} from '@radix-ui/react-select';

// Tabs
export {
  Root as Tabs,
  List as TabsList,
  Trigger as TabsTrigger,
  Content as TabsContent,
} from '@radix-ui/react-tabs';

// Toast
export {
  Provider as ToastProvider,
  Root as Toast,
  Action as ToastAction,
  Close as ToastClose,
  Viewport as ToastViewport,
  Title as ToastTitle,
  Description as ToastDescription,
} from '@radix-ui/react-toast';

// Tooltip
export {
  Provider as TooltipProvider,
  Root as Tooltip,
  Trigger as TooltipTrigger,
  Portal as TooltipPortal,
  Content as TooltipContent,
  Arrow as TooltipArrow,
} from '@radix-ui/react-tooltip';

// Other commonly used components
export { Root as Label } from '@radix-ui/react-label';
export { Root as Separator } from '@radix-ui/react-separator';
export { Root as Switch } from '@radix-ui/react-switch';
export { Root as Checkbox } from '@radix-ui/react-checkbox';
export { Root as RadioGroup, Item as RadioGroupItem } from '@radix-ui/react-radio-group';
export { Root as Progress } from '@radix-ui/react-progress';
export { Root as Slider } from '@radix-ui/react-slider';
export { Root as Avatar, Image as AvatarImage, Fallback as AvatarFallback } from '@radix-ui/react-avatar';
export { Root as Popover, Trigger as PopoverTrigger, Portal as PopoverPortal, Content as PopoverContent, Arrow as PopoverArrow, Close as PopoverClose, Anchor as PopoverAnchor } from '@radix-ui/react-popover';
export { Root as ScrollArea, Viewport as ScrollAreaViewport, Scrollbar as ScrollAreaScrollbar, Thumb as ScrollAreaThumb, Corner as ScrollAreaCorner } from '@radix-ui/react-scroll-area';

// Slot for composition
export { Slot } from '@radix-ui/react-slot';

// Primitive exports
export * from '@radix-ui/react-primitive';