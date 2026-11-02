-- Coordenadas aproximadas de cada colonia (GeoNames): centran el mapa al escribir el código postal.
ALTER TABLE "PostalCode" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "PostalCode" ADD COLUMN "longitude" DOUBLE PRECISION;
