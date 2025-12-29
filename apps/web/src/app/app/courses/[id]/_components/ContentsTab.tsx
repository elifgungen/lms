"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileVideo, FileText } from "lucide-react"

export default function ContentsTab() {
    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="pt-6">
                    <div className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer">
                        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">Upload Content</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Drag and drop video or PDF files here, or click to select.
                        </p>
                        <Button variant="outline" className="mt-4">Select Files</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Add New Content Metadata</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Content Type</Label>
                        <div className="flex gap-4">
                            <Button variant="secondary" className="flex-1">
                                <FileVideo className="mr-2 h-4 w-4" /> Video
                            </Button>
                            <Button variant="outline" className="flex-1">
                                <FileText className="mr-2 h-4 w-4" /> PDF
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" placeholder="e.g. Chapter 1 Slides" />
                    </div>
                </div>
            </div>
        </div>
    )
}
