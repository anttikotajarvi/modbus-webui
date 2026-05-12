<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import TagInput from "@/ui/generics/custom-input/TagInput.svelte";
  import { Label } from "$lib/components/ui/label";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import type { LibraryData, ProfileTag } from "@/sys/library/types"
  import type { SvimmerWriter } from "svimmer-store"
  import { activeProfileLoc, profileKeys } from "@/sys/state"
  import { performCreateProfile } from "@/actions/profile"


  let {
    open = $bindable<boolean>(false),
    lib
    }: {
    open: boolean;
    lib: SvimmerWriter<LibraryData>
  } = $props();

  // svelte-ignore state_referenced_locally
  const profilesRef = lib.focus(x => x.profiles)
  // svelte-ignore state_referenced_locally
  const profileRef = lib.follow(activeProfileLoc);

  let profileTags = $derived($profilesRef.read(profileKeys))
  
  let newId = $state<ProfileTag | null>(null);
  let template = $state<"default" | "current">("default");

  async function AddNewProfile() {
    if (!newIdValidity.valid) return;

    const nextId = newId!;

    errorText = "";
    open = false; // close modal first
    
    const data = template == "current" ? profileRef.value() : undefined;

    performCreateProfile(lib, nextId, data )
  }

  function validateProfileId(id: string) {
    const v = (id ?? "").trim();
    if (v === "")
      return { valid: false, msg: "Profile identifier cannot be empty" };
    if (profileTags.includes(v as ProfileTag))
      return { valid: false, msg: "Profile name is already taken" };
    return { valid: true, msg: "" };
  }

  let newIdValidity = $derived(validateProfileId(newId ?? ""));

  // Error text for the profile ID input
  let errorText = $derived(!newIdValidity.valid ? newIdValidity.msg : "");

  // Initialize/reset input + error when opening the modal
  $effect(() => {
    if (open) {
      newId = null; // reset field
      errorText = ""; // temporary override of the derived
    }
  });
</script>

<!-- Modal to create new profile -->
<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Add new profile</Dialog.Title>
      <Dialog.Description class="text-sm text-muted-foreground">
        Profile saves the current connections settings, table layout and
        nametable selection.
        <br />
        You can create multiple profiles to quickly switch between different configurations.
      </Dialog.Description>
    </Dialog.Header>
    <div class="w-full max-w-[500px]">
      <div class="grid grid-cols-[120px,1fr] gap-x-4 gap-y-3 py-2">
        <!-- Profile ID -->
        <Label for="create-profile-id" class="justify-self-end self-center text-right"
          >Profile ID</Label
        >
        <TagInput
          id="create-profile-id"
          placeholder="PROFILE_IDENTIFIER"
          bind:value={newId}
          class="w-full"
        />

        <!-- Error text directly under input (same column) -->
        <div class="col-start-2">
          <p
            class={`text-sm ${errorText ? "text-destructive" : "text-muted-foreground"}`}
          >
            {errorText || "Use A–Z and “_”; digits allowed but not first."}
          </p>
        </div>

        <!-- Template -->
        <Label
          for="create-profile-template"
          class="justify-self-end self-start pt-1 text-right">Template</Label
        >
        <RadioGroup.Root
          id="create-profile-template"
          bind:value={template}
          class="flex flex-col gap-2"
        >
          <div class="flex items-center gap-2 p-1">
            <RadioGroup.Item value="default" id="r1" />
            <Label for="r1" class="cursor-pointer">Default (empty)</Label>

            <RadioGroup.Item value="current" id="r2" />
            <Label for="r2" class="cursor-pointer">Copy current</Label>
          </div>
        </RadioGroup.Root>
      </div>
    </div>
    <Dialog.Footer>
      <Button
        id="create-profile-cancel"
        disabled={!newIdValidity.valid}
        variant="secondary"
        onclick={(e) => {
          e.preventDefault();
          AddNewProfile();
        }}
      >
        Create
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
