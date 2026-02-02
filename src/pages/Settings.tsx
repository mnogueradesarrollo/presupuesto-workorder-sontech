import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getSettings, saveSettings } from "../services/settings";
import type { BusinessSettings } from "../services/settings";
import { toast } from "react-hot-toast";

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { register, handleSubmit, reset } = useForm<BusinessSettings>();

    useEffect(() => {
        (async () => {
            try {
                const data = await getSettings();
                if (data) {
                    reset(data);
                }
            } catch (e) {
                console.error(e);
                toast.error("Error al cargar la configuración");
            } finally {
                setLoading(false);
            }
        })();
    }, [reset]);

    const onSubmit = async (data: BusinessSettings) => {
        setSaving(true);
        try {
            await saveSettings(data);
            toast.success("Configuración guardada satisfactoriamente");
        } catch (e) {
            console.error(e);
            toast.error("Error al guardar la configuración");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="container">Cargando…</div>;

    return (
        <div className="container">
            <div className="card">
                <h2 className="title">Configuración de la Empresa</h2>
                <p style={{ color: "var(--muted)", textAlign: "center", marginBottom: 20 }}>
                    Estos datos aparecerán en los presupuestos y órdenes de trabajo en PDF.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Nombre de la empresa</label>
                            <input
                                {...register("name")}
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
                                placeholder="Ej: Sontech Sistemas"
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Email de contacto</label>
                            <input
                                {...register("email")}
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
                                placeholder="ejemplo@correo.com"
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Teléfono / WhatsApp</label>
                            <input
                                {...register("phone")}
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
                                placeholder="11 1234 5678"
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Dirección</label>
                            <input
                                {...register("address")}
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
                                placeholder="Calle 123, Ciudad"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>URL del Logo (Opcional)</label>
                        <input
                            {...register("logoUrl")}
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
                            placeholder="https://tu-sitio.com/logo.png"
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Pie de página del PDF (Opcional)</label>
                        <textarea
                            {...register("footerText")}
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", minHeight: 80 }}
                            placeholder="Gracias por confiar en nosotros..."
                        />
                    </div>

                    <div className="right" style={{ marginTop: 10 }}>
                        <button type="submit" className="btn primary" disabled={saving}>
                            {saving ? "Guardando…" : "Guardar Configuración"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
