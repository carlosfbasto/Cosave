-- Recuadro del municipio (mapa de publicar): se consulta por estado + municipio.
CREATE INDEX "PostalCode_state_municipality_idx" ON "PostalCode"("state", "municipality");
