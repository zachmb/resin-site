<script lang="ts">
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap,
    } from "@xyflow/svelte";
    import "@xyflow/svelte/dist/style.css";
    import { onMount, untrack } from "svelte";
    import { fade } from "svelte/transition";

    interface Props {
        notes?: any[];
        initialEdges?: any[];
        onNoteDropped?: () => void;
    }

    let { notes = [], initialEdges = [], onNoteDropped }: Props = $props();

    // Convert notes to Svelte Flow nodes
    let nodes = $state<any[]>([]);
    let edges = $state<any[]>([]);

    $effect(() => {
        nodes = notes.map((note: any) => {
            // Find existing node tracking safely using untrack to prevent infinite loops
            const existing = untrack(() => nodes.find((n) => n.id === note.id));
            return {
                id: note.id,
                type: "default",
                position: existing
                    ? existing.position
                    : {
                          x: note.position_x || Math.random() * 200,
                          y: note.position_y || Math.random() * 200,
                      },
                data: { label: note.title || "Untitled Note" },
                style: "background: #FCF9F2; border: 1px solid rgba(43, 70, 52, 0.2); border-radius: 12px; padding: 10px; font-weight: bold; color: #2B4634; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);",
            };
        });

        edges = initialEdges.map((edge: any) => ({
            id: edge.id,
            source: edge.source_id,
            target: edge.target_id,
            style: "stroke: #2B4634; stroke-width: 2px;",
            animated: true,
        }));
    });

    let saveTimeout: ReturnType<typeof setTimeout>;

    const onNodeDragStop = (event: any, node?: any, nodes?: any) => {
        if (!node) return;
        // Debounce saving position to DB
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const formData = new FormData();
            formData.append("id", node.id);
            formData.append("position_x", node.position.x.toString());
            formData.append("position_y", node.position.y.toString());

            try {
                await fetch("/map?/updateNodePosition", {
                    method: "POST",
                    body: formData,
                });
            } catch (error) {
                console.error("Failed to save node position:", error);
            }
        }, 500);
    };

    let wrapper: HTMLElement;

    const onDragOver = (event: DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    };

    const onDrop = async (event: DragEvent) => {
        event.preventDefault();

        // Ensure we only process drops containing our SvelteFlow type
        const noteId = event.dataTransfer?.getData("application/svelteflow");
        if (!noteId || !wrapper) return;

        // Calculate drop position relative to the flow view
        const reactFlowBounds = wrapper.getBoundingClientRect();
        // SvelteFlow doesn't currently expose `project` globally off the shelf without useSvelteFlow
        // but since we are simple, we can visually offset it
        const position_x = event.clientX - reactFlowBounds.left;
        const position_y = event.clientY - reactFlowBounds.top;

        // Optimistically add just so it feels fast
        nodes = [
            ...nodes,
            {
                id: noteId,
                type: "default",
                position: { x: position_x, y: position_y },
                data: { label: "Loading..." }, // will get synced via invalidateAll quickly
                style: "background: #FCF9F2; border: 1px solid rgba(43, 70, 52, 0.2); border-radius: 12px; padding: 10px; font-weight: bold; color: #2B4634; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);",
            },
        ];

        // Save new position + is_on_map
        const formData = new FormData();
        formData.append("id", noteId);
        formData.append("position_x", position_x.toString());
        formData.append("position_y", position_y.toString());

        try {
            await fetch("/map?/updateNodePosition", {
                method: "POST",
                body: formData,
            });

            if (onNoteDropped) {
                onNoteDropped();
            }
        } catch (error) {
            console.error("Failed to add note to map:", error);
        }
    };

    const onConnect = async (params: any) => {
        // Optimistically add edge to UI
        const tempId = `temp-${Date.now()}`;
        edges = [
            ...edges,
            {
                id: tempId,
                source: params.source,
                target: params.target,
                style: "stroke: #2B4634; stroke-width: 2px;",
                animated: true,
            },
        ];

        // Save edge to DB
        const formData = new FormData();
        formData.append("source_id", params.source);
        formData.append("target_id", params.target);

        try {
            const response = await fetch("/map?/createEdge", {
                method: "POST",
                body: formData,
            });
            // We'd ideally parse response to get the real UUID and replace tempId
        } catch (error) {
            console.error("Failed to save edge:", error);
            // Revert on failure
            edges = edges.filter((e: any) => e.id !== tempId);
        }
    };

    const onDelete = async ({
        nodes: deletedNodes,
        edges: deletedEdges,
    }: any) => {
        // Handle edges
        for (const edge of deletedEdges) {
            const formData = new FormData();
            formData.append("id", edge.id);
            try {
                await fetch("/map?/deleteEdge", {
                    method: "POST",
                    body: formData,
                });
            } catch (error) {
                console.error("Failed to delete edge:", error);
            }
        }

        // Handle nodes removed from map (put them back in sidebar)
        for (const node of deletedNodes) {
            const formData = new FormData();
            formData.append("id", node.id);
            try {
                await fetch("/map?/removeFromMap", {
                    method: "POST",
                    body: formData,
                });
            } catch (error) {
                console.error("Failed to remove node from map:", error);
            }
        }

        if (deletedNodes.length > 0 && onNoteDropped) {
            // Resync unmapped/mapped notes
            setTimeout(() => onNoteDropped(), 100);
        }
    };

    const onNodeClick = (...args: any[]) => {
        // Can add click-to-open logic later if requested
    };
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    bind:this={wrapper}
    class="w-full h-full"
    in:fade={{ duration: 300 }}
    ondragover={onDragOver}
    ondrop={onDrop}
>
    <SvelteFlow
        {nodes}
        {edges}
        onnodedragstop={onNodeDragStop}
        onconnect={onConnect}
        ondelete={onDelete}
        onnodeclick={onNodeClick}
        fitView
    >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} />
        <MiniMap />
    </SvelteFlow>
</div>

<style>
    /* Custom Svelte Flow Overrides */
    :global(.svelte-flow__panel) {
        margin: 20px;
    }
    :global(.svelte-flow__controls) {
        box-shadow:
            0 10px 15px -3px rgb(0 0 0 / 0.1),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
        border: none;
        border-radius: 12px;
        overflow: hidden;
    }
    :global(.svelte-flow__controls-button) {
        border-bottom: 1px solid rgba(43, 70, 52, 0.1);
        background: #fcf9f2;
        color: #2b4634;
    }
    :global(.svelte-flow__controls-button:hover) {
        background: #f3ece1;
    }
</style>
