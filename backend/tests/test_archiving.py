import sys
import os
from decimal import Decimal
from datetime import datetime
from fastapi.testclient import TestClient

# Add parent directory to path so imports work
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
import main

def test_archiving():
    db = SessionLocal()
    client = TestClient(main.app)
    
    # 1. Setup DB Mock data
    org = models.Organization(id="test-arch-org-1", name="Archiving Test Org", inventoryEnabled=True)
    db.add(org)
    
    venue = models.Venue(
        id="test-arch-venue-1",
        name="Archiving Test Venue",
        organizationId="test-arch-org-1",
        currency="TRY",
        defaultLocale="tr",
        supportedLocales=["tr", "en"]
    )
    db.add(venue)
    db.flush()
    
    table = models.Table(
        id="test-arch-table-1",
        name="Archiving Table",
        qrToken="archtesttoken",
        venueId="test-arch-venue-1"
    )
    db.add(table)
    
    supplier = models.Supplier(
        id="test-arch-supplier-1",
        name="Archiving Supplier",
        venueId="test-arch-venue-1"
    )
    db.add(supplier)
    
    # Setup order
    order = models.Order(
        id="test-arch-order-1",
        venueId="test-arch-venue-1",
        tableId="test-arch-table-1",
        status="completed",
        totalAmount=Decimal("250.00"),
        isArchived=False
    )
    db.add(order)
    
    # Setup invoice
    invoice = models.Invoice(
        id="test-arch-invoice-1",
        supplierId="test-arch-supplier-1",
        invoiceDate=datetime.utcnow(),
        totalAmount=Decimal("1200.00"),
        status="processed",
        venueId="test-arch-venue-1",
        isArchived=False
    )
    db.add(invoice)
    
    db.commit()
    
    try:
        # 2. Test initial listings (should show active, unarchived order and invoice)
        print("Verifying initial listings show unarchived items...")
        res_orders = client.get("/api/admin/orders?venueId=test-arch-venue-1")
        assert res_orders.status_code == 200
        order_ids = [o["id"] for o in res_orders.json()]
        assert "test-arch-order-1" in order_ids
        
        res_invoices = client.get("/api/admin/inventory/invoices?venueId=test-arch-venue-1")
        assert res_invoices.status_code == 200
        invoice_ids = [i["id"] for i in res_invoices.json()]
        assert "test-arch-invoice-1" in invoice_ids
        
        # 3. Archive the order and invoice
        print("Archiving order and invoice...")
        res_arch_order = client.put("/api/admin/orders/test-arch-order-1/archive", json={"isArchived": True})
        assert res_arch_order.status_code == 200
        assert res_arch_order.json()["isArchived"] is True
        
        res_arch_invoice = client.put("/api/admin/inventory/invoices/test-arch-invoice-1/archive", json={"isArchived": True})
        assert res_arch_invoice.status_code == 200
        assert res_arch_invoice.json()["isArchived"] is True
        
        # 4. Verify listings with includeArchived=False (default) hide them
        print("Verifying archived items are filtered out by default...")
        res_orders_filtered = client.get("/api/admin/orders?venueId=test-arch-venue-1")
        assert res_orders_filtered.status_code == 200
        order_ids_filtered = [o["id"] for o in res_orders_filtered.json()]
        assert "test-arch-order-1" not in order_ids_filtered
        
        res_invoices_filtered = client.get("/api/admin/inventory/invoices?venueId=test-arch-venue-1")
        assert res_invoices_filtered.status_code == 200
        invoice_ids_filtered = [i["id"] for i in res_invoices_filtered.json()]
        assert "test-arch-invoice-1" not in invoice_ids_filtered
        
        # 5. Verify listings with includeArchived=True return them
        print("Verifying archived items return when includeArchived=true...")
        res_orders_all = client.get("/api/admin/orders?venueId=test-arch-venue-1&includeArchived=true")
        assert res_orders_all.status_code == 200
        order_ids_all = [o["id"] for o in res_orders_all.json()]
        assert "test-arch-order-1" in order_ids_all
        
        res_invoices_all = client.get("/api/admin/inventory/invoices?venueId=test-arch-venue-1&includeArchived=true")
        assert res_invoices_all.status_code == 200
        invoice_ids_all = [i["id"] for i in res_invoices_all.json()]
        assert "test-arch-invoice-1" in invoice_ids_all
        
        # 6. Unarchive items
        print("Unarchiving order and invoice...")
        res_unarch_order = client.put("/api/admin/orders/test-arch-order-1/archive", json={"isArchived": False})
        assert res_unarch_order.status_code == 200
        assert res_unarch_order.json()["isArchived"] is False
        
        res_unarch_invoice = client.put("/api/admin/inventory/invoices/test-arch-invoice-1/archive", json={"isArchived": False})
        assert res_unarch_invoice.status_code == 200
        assert res_unarch_invoice.json()["isArchived"] is False
        
        # 7. Verify they show up again in default listings
        print("Verifying unarchived items reappear in default listings...")
        res_orders_final = client.get("/api/admin/orders?venueId=test-arch-venue-1")
        assert "test-arch-order-1" in [o["id"] for o in res_orders_final.json()]
        
        res_invoices_final = client.get("/api/admin/inventory/invoices?venueId=test-arch-venue-1")
        assert "test-arch-invoice-1" in [i["id"] for i in res_invoices_final.json()]
        
        print("Archiving test suite PASSED!")
        
    finally:
        # 8. Clean up
        print("Cleaning up test database records...")
        db.query(models.Invoice).filter(models.Invoice.id.like("test-arch-%")).delete()
        db.query(models.Order).filter(models.Order.id.like("test-arch-%")).delete()
        db.query(models.Supplier).filter(models.Supplier.id.like("test-arch-%")).delete()
        db.query(models.Table).filter(models.Table.id.like("test-arch-%")).delete()
        db.query(models.Venue).filter(models.Venue.id.like("test-arch-%")).delete()
        db.query(models.Organization).filter(models.Organization.id.like("test-arch-%")).delete()
        db.commit()
        db.close()

if __name__ == "__main__":
    print("Running archiving tests...")
    test_archiving()
    print("All archiving tests passed successfully!")
