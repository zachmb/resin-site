<script lang="ts">
    import { Handle, Position } from "@xyflow/svelte";
    let { id, data } = $props<{ id: string; data: { label: string; onDelete: (id: string) => void } }>();
</script>

<div class="map-node">
    <button class="delete-btn" onclick={() => data.onDelete(id)}>×</button>
    <Handle type="target" position={Position.Left} />
    <p>{data.label}</p>
    <Handle type="source" position={Position.Right} />
</div>

<style>
    .map-node {
        position: relative;
        background: #FCF9F2;
        border: 1px solid rgba(43, 70, 52, 0.2);
        border-radius: 12px;
        padding: 10px 14px;
        font-weight: bold;
        color: #2B4634;
        min-width: 120px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }
    .delete-btn {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 18px;
        height: 18px;
        background: #2B4634;
        color: white;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.15s;
    }
    .map-node:hover .delete-btn {
        opacity: 1;
    }
    p {
        margin: 0;
        font-size: 14px;
    }
</style>
